/**
 * Creates the bright neutral WebGL studio, physical lighting and camera for the category bay.
 * Depends on Three.js, procedural bay meshes and automotive reflection cards; owns GPU stage resources.
 */
import * as THREE from 'three';
import { buildScanningBay } from './bayGeometry';
import type { BayChoreographyState } from './bayChoreography';
import { normalizeBayVisualSettings, type BayVisualSettings } from './bayControls';
import { createBayStudioEnvironment } from './bayStudioEnvironment';

export function createBayScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  const bay = buildScanningBay();
  const stageGeometry: THREE.BufferGeometry[] = [];
  const stageMaterials: THREE.Material[] = [];
  let reflectionMap: THREE.WebGLRenderTarget | undefined;
  let disposed = false;
  let lastProgress = Number.NaN;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene.background = new THREE.Color('#f2f4f4');
  scene.fog = new THREE.Fog('#f2f4f4', 30, 75);
  scene.add(bay.root);

  const key = new THREE.DirectionalLight('#ffffff', 2.6);
  key.position.set(-5, 10, 7);
  key.target.position.set(0, 0, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(
    window.innerWidth < 650 ? 1024 : 2048,
    window.innerWidth < 650 ? 1024 : 2048,
  );
  Object.assign(key.shadow.camera, {
    left: -7,
    right: 7,
    top: 10,
    bottom: -8,
    near: 0.5,
    far: 35,
  });
  key.shadow.bias = -0.00004;
  key.shadow.normalBias = 0.004;
  key.shadow.radius = 3;
  const rim = new THREE.DirectionalLight('#f3f7fa', 1.1);
  rim.position.set(7, 7, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight('#ffffff', '#7e898f', 0.35));

  try {
    const studio = createBayStudioEnvironment();
    const prefilter = new THREE.PMREMGenerator(renderer);
    try {
      reflectionMap = prefilter.fromScene(studio.scene, 0.025);
    } finally {
      studio.dispose();
      prefilter.dispose();
    }
    scene.environment = reflectionMap.texture;
    scene.environmentIntensity = 0.95;

    const lineMaterial = new THREE.MeshStandardMaterial({ color: '#e1e5df', roughness: 0.94 });
    const lineGeometry = new THREE.BoxGeometry(0.022, 0.002, 24);
    stageMaterials.push(lineMaterial);
    stageGeometry.push(lineGeometry);
    for (const side of [-1, 1]) {
      const guide = new THREE.Mesh(lineGeometry, lineMaterial);
      guide.position.set(side * 2.55, -0.009, 4);
      guide.receiveShadow = true;
      scene.add(guide);
    }
  } catch (error) {
    bay.dispose();
    reflectionMap?.dispose();
    key.shadow.dispose();
    renderer.dispose();
    throw error;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 650 ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return {
    scene,
    camera,
    resize,
    async prepare(state: BayChoreographyState) {
      if (disposed) return;

      //
      // Compile the car and procedural surface shaders behind the loader to avoid a hitch during their reveal.
      //
      bay.applyIllumination(state);
      await renderer.compileAsync(scene, camera);
    },
    invalidateShadows() {
      lastProgress = Number.NaN;
    },
    setVisualSettings(settings: BayVisualSettings) {
      if (disposed) return;
      bay.applySettings(normalizeBayVisualSettings(settings));
      lastProgress = Number.NaN;
    },
    render(state: BayChoreographyState) {
      if (disposed) return;
      bay.applyIllumination(state);
      key.intensity = 2.6 - state.focus * 0.2 + state.sensorEmphasis * 0.2;
      rim.intensity = 1.1 - state.focus * 0.15 + state.sensorEmphasis * 0.2;
      if (lastProgress !== state.entryProgress) {
        renderer.shadowMap.needsUpdate = true;
        lastProgress = state.entryProgress;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      bay.dispose();
      scene.environment = null;
      reflectionMap?.dispose();
      key.shadow.dispose();
      stageGeometry.forEach((geometry) => geometry.dispose());
      stageMaterials.forEach((material) => material.dispose());
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
    },
  };
}
