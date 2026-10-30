/**
 * Adds restrained manufactured grain to tunnel PBR surfaces without texture requests or extra draws.
 * Depends on Three.js standard/physical shader chunks; retains authored maps, lighting and shadows.
 * World-space scale and pixel-footprint filtering keep instanced parts consistent without distant shimmer.
 */
import type { MeshStandardMaterial } from 'three';

type BaySurfaceFinish = 'powder' | 'brushed' | 'deck';

const finishProfiles = {
  powder: { scale: 'vec3(850.0)', variation: 0.07, relief: 0.000009 },
  brushed: { scale: 'vec3(1100.0, 1100.0, 7.0)', variation: 0.06, relief: 0.000003 },
  deck: { scale: 'vec3(1400.0, 1400.0, 5.0)', variation: 0.07, relief: 0.000004 },
} satisfies Record<BaySurfaceFinish, { scale: string; variation: number; relief: number }>;

// ============================================================
// Metre coordinates and filtered grain shared by all PBR variants
// ============================================================

const worldPositionVertex = `
vec4 cabekFinishPosition = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  cabekFinishPosition = batchingMatrix * cabekFinishPosition;
#endif
#ifdef USE_INSTANCING
  cabekFinishPosition = instanceMatrix * cabekFinishPosition;
#endif
vCabekFinishPosition = (modelMatrix * cabekFinishPosition).xyz;
`;

const surfaceFunctionsFragment = `
varying vec3 vCabekFinishPosition;

float cabekFinishHash(vec3 point) {
  point = fract(point * 0.1031);
  point += dot(point, point.yzx + 33.33);
  return fract((point.x + point.y) * point.z);
}

float cabekFinishNoise(vec3 point) {
  vec3 cell = floor(point);
  vec3 weight = fract(point);
  weight = weight * weight * (3.0 - 2.0 * weight);
  return mix(
    mix(mix(cabekFinishHash(cell), cabekFinishHash(cell + vec3(1, 0, 0)), weight.x),
        mix(cabekFinishHash(cell + vec3(0, 1, 0)), cabekFinishHash(cell + vec3(1, 1, 0)), weight.x), weight.y),
    mix(mix(cabekFinishHash(cell + vec3(0, 0, 1)), cabekFinishHash(cell + vec3(1, 0, 1)), weight.x),
        mix(cabekFinishHash(cell + vec3(0, 1, 1)), cabekFinishHash(cell + vec3(1, 1, 1)), weight.x), weight.y),
    weight.z);
}

vec3 cabekFinishNormal(vec3 position, vec3 surfaceNormal, float height, float face) {
  vec3 surfaceX = dFdx(position);
  vec3 surfaceY = dFdy(position);
  vec3 crossY = cross(surfaceY, surfaceNormal);
  vec3 crossX = cross(surfaceNormal, surfaceX);
  float determinant = dot(surfaceX, crossY) * face;
  vec3 gradient = sign(determinant) * (dFdx(height) * crossY + dFdy(height) * crossX);
  return normalize(max(abs(determinant), 1e-10) * surfaceNormal - gradient);
}
`;

function createRoughnessFragment(finish: BaySurfaceFinish): string {
  const profile = finishProfiles[finish];
  return `
vec3 cabekGrainPosition = vCabekFinishPosition * ${profile.scale};
float cabekGrainFootprint = max(length(dFdx(cabekGrainPosition)), length(dFdy(cabekGrainPosition)));
float cabekGrainVisibility = 1.0 - smoothstep(0.25, 0.9, cabekGrainFootprint);
float cabekFineGrain = (cabekFinishNoise(cabekGrainPosition) - 0.5) * cabekGrainVisibility;
vec3 cabekBroadPosition = vCabekFinishPosition * 7.5;
float cabekBroadFootprint = max(length(dFdx(cabekBroadPosition)), length(dFdy(cabekBroadPosition)));
float cabekBroadGrain = (cabekFinishNoise(cabekBroadPosition) - 0.5) * (1.0 - smoothstep(0.25, 0.9, cabekBroadFootprint));
roughnessFactor = clamp(roughnessFactor + cabekFineGrain * ${profile.variation} + cabekBroadGrain * 0.012, 0.04, 1.0);
float cabekSurfaceHeight = cabekFineGrain * ${profile.relief.toFixed(8)};
`;
}

// ============================================================
// Preserve the standard shader pipeline and its resource ownership
// ============================================================

export function applyBaySurfaceFinish(
  material: MeshStandardMaterial,
  finish: BaySurfaceFinish,
): void {
  const previousCompile = material.onBeforeCompile;
  const previousCacheKey = material.customProgramCacheKey();

  //
  // glTF keeps scalar PBR values; this metadata records which editable Blender finish restores grain.
  //
  material.userData.cabekSurfaceFinish = finish;
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCabekFinishPosition;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${worldPositionVertex}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${surfaceFunctionsFragment}`)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n${createRoughnessFragment(finish)}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
normal = cabekFinishNormal(-vViewPosition, normal, cabekSurfaceHeight, faceDirection);`,
      );
  };

  //
  // Profiles insert different GLSL constants, so sharing one cached program would apply the wrong finish.
  //
  material.customProgramCacheKey = () => `${previousCacheKey}|cabek-surface-v1:${finish}`;
  material.needsUpdate = true;
}
