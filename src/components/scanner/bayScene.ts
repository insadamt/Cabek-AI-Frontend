/**
 * Creates the real WebGL studio, physical lighting and camera for the category bay.
 * Depends on Three.js and procedural bay meshes; owns renderer, reflection map, shadows and stage resources.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildScanningBay } from './bayGeometry';
import type { BayChoreographyState } from './bayChoreography';
import { normalizeBayVisualSettings, type BayVisualSettings } from './bayControls';

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
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene.background = new THREE.Color('#f3f4f0');
  scene.fog = new THREE.Fog('#f3f4f0', 30, 75);
  scene.add(bay.root);

  const key = new THREE.DirectionalLight('#fffaf3', 3.45);
  key.position.set(-5, 11, 8);
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
  key.shadow.bias = -0.0001;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 2.5;
  const rim = new THREE.DirectionalLight('#edf4fa', 1.7);
  rim.position.set(7, 6, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight('#ffffff', '#bdc3bc', 0.8));

  try {
    const studio = new RoomEnvironment();
    const prefilter = new THREE.PMREMGenerator(renderer);
    try {
      reflectionMap = prefilter.fromScene(studio, 0.035);
    } finally {
      studio.dispose();
      prefilter.dispose();
    }
    scene.environment = reflectionMap.texture;
    scene.environmentIntensity = 0.75;

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
      key.intensity = 3.45 - state.focus * 0.25 + state.sensorEmphasis * 0.2;
      rim.intensity = 1.7 - state.focus * 0.25 + state.sensorEmphasis * 0.25;
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
