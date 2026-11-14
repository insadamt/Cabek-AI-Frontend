/**
 * Loads the supplied sedan with black clearcoat paint against the white automotive studio.
 * Depends on Three.js GLTF/Draco loaders and the studio-v2 GLB; owns decoded and enhanced GPU resources.
 */
import * as THREE from 'three';
import { createResourceOwner } from './bayModelResources';
import { loadBayModel } from './bayModelLoader';

const vehicleAssetDirectory = '/models/studio-v2/';
const vehicleModelUrl = `${vehicleAssetDirectory}cabek-vehicle.glb`;

export interface BayVehicle {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  dispose: () => void;
}

// ============================================================
// Preserve authored PBR layers while controlling studio reflections
// ============================================================

function enhancePaintMaterial(source: THREE.Material): THREE.Material {
  if (!(source instanceof THREE.MeshStandardMaterial) || !/paint/i.test(source.name)) return source;
  const paint =
    source instanceof THREE.MeshPhysicalMaterial
      ? source.clone()
      : new THREE.MeshPhysicalMaterial();
  if (!(source instanceof THREE.MeshPhysicalMaterial)) {
    //
    // Copy only the standard PBR layer because its source has no physical-extension fields.
    //
    THREE.MeshStandardMaterial.prototype.copy.call(paint, source);
    Object.assign(paint, { defines: { STANDARD: '', PHYSICAL: '' } });
    paint.clearcoat = 0.65;
    paint.clearcoatRoughness = 0.18;
  } else {
    paint.clearcoat = Math.max(source.clearcoat, 0.65);
    paint.clearcoatRoughness = Math.min(source.clearcoatRoughness, 0.18);
  }
  paint.roughness = Math.max(source.roughness, 0.22);
  paint.color.set('#111416');
  paint.envMapIntensity = Math.min(source.envMapIntensity, 1.05);
  return paint;
}

function enhanceVehicleMaterial(source: THREE.Material): THREE.Material {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source;
  if (/paint/i.test(source.name)) return enhancePaintMaterial(source);
  if (/^Glass_ext/i.test(source.name) && source instanceof THREE.MeshPhysicalMaterial) {
    const glass = source.clone();
    glass.roughness = Math.max(source.roughness, 0.09);
    glass.clearcoat = Math.min(source.clearcoat, 0.4);
    glass.clearcoatRoughness = Math.max(source.clearcoatRoughness, 0.1);
    glass.envMapIntensity = Math.min(source.envMapIntensity, 0.85);
    return glass;
  }
  if (/^(?:tire|tyre|Rubber_)/i.test(source.name)) {
    const rubber = source.clone();
    rubber.roughness = Math.max(source.roughness, 0.82);
    rubber.metalness = Math.min(source.metalness, 0.02);
    rubber.envMapIntensity = Math.min(source.envMapIntensity, 0.55);
    return rubber;
  }
  if (/^(?:Metal_-_Chrome|MetalStainlessSteel)/i.test(source.name)) {
    const alloy = source.clone();
    alloy.roughness = Math.max(source.roughness, 0.26);
    alloy.envMapIntensity = Math.min(source.envMapIntensity, 0.95);
    return alloy;
  }
  return source;
}

function isOpaqueVehicleSurface(material: THREE.Material) {
  return (
    !material.transparent &&
    !(material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0)
  );
}

function prepareVehicle(scene: THREE.Group, signal: AbortSignal): BayVehicle {
  const resources = createResourceOwner();
  resources.capture(scene);
  const root = new THREE.Group();
  root.name = 'CabekVehicle';
  root.add(scene);

  try {
    signal.throwIfAborted();
    const replacements = new Map<THREE.Material, THREE.Material>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const studioMaterials = sourceMaterials.map((source) => {
        let studioMaterial = replacements.get(source);
        if (!studioMaterial) {
          studioMaterial = enhanceVehicleMaterial(source);
          replacements.set(source, studioMaterial);
          resources.rememberMaterial(studioMaterial);
        }
        return studioMaterial;
      });
      object.material = Array.isArray(object.material) ? studioMaterials : studioMaterials[0];
      //
      // The exported body batches glass and solid panels together; glass must not suppress its entire shadow.
      //
      object.castShadow = studioMaterials.some(isOpaqueVehicleSurface);
      object.receiveShadow = true;
    });

    //
    // Retaining wheel model space lets rolling use the authored pivots after grounding the containing scene.
    //
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    scene.position.x -= center.x;
    scene.position.y -= bounds.min.y;
    scene.position.z -= center.z;
    const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']
      .map((name) => scene.getObjectByName(name))
      .filter((wheel): wheel is THREE.Object3D => Boolean(wheel));
    signal.throwIfAborted();

    return {
      root,
      wheels,
      dispose() {
        root.removeFromParent();
        root.clear();
        resources.dispose();
      },
    };
  } catch (error) {
    root.clear();
    resources.dispose();
    throw error;
  }
}

export async function loadBayVehicle(signal: AbortSignal): Promise<BayVehicle> {
  const gltf = await loadBayModel(vehicleModelUrl, signal);
  return prepareVehicle(gltf.scene, signal);
}
