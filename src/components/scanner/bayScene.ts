/**
 * Creates the bright neutral WebGL studio, physical lighting and camera for the category bay.
 * Depends on Three.js, the Blender tunnel and automotive reflection cards; owns GPU stage resources.
 */
import * as THREE from 'three';
import { createBayCaptureSweep } from './bayCaptureSweep';
import type { CapturePresentationFrame } from './bayCaptureLight';
import { loadBayTunnel } from './bayTunnel';
import type { BayChoreographyState } from './bayChoreography';
import { defaultBayVisualSettings, type BayVisualSettings } from './bayControls';
import { createBayStudioEnvironment } from './bayStudioEnvironment';

export function createBayScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const scene = new THREE.Scene();
  const sweep = createBayCaptureSweep();
  scene.add(sweep.root);
  const drawingSize = new THREE.Vector2();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  let bay: Awaited<ReturnType<typeof loadBayTunnel>> | undefined;
  let settings: BayVisualSettings = defaultBayVisualSettings;
  let reflectionMap: THREE.WebGLRenderTarget | undefined;
  let disposed = false;
  let lastProgress = Number.NaN;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  // Resolve the same surface as the loading screen and page instead of maintaining a separate tint.

  const studioBackground =
    getComputedStyle(canvas).getPropertyValue('--studio-background').trim() || '#fafafa';
  scene.background = new THREE.Color(studioBackground);
  scene.fog = new THREE.Fog(studioBackground, 30, 75);

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
  // Lift the far frame and roof edges so the higher camera retains depth against the studio.
  const rim = new THREE.DirectionalLight('#f3f7fa', 1.35);
  rim.position.set(7, 7, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight('#ffffff', '#7e898f', 0.45));

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
    scene.environmentIntensity = 1.05;
  } catch (error) {
    sweep.dispose();
    reflectionMap?.dispose();
    key.shadow.dispose();
    renderer.dispose();
    throw error;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    // Supersample fine silhouettes on 1× monitors while bounding fill cost on large displays.
    const ratio = Math.min(
      Math.max(1.4, window.devicePixelRatio || 1),
      2.5,
      Math.sqrt(5_000_000 / (width * height)),
    );
    renderer.getSize(drawingSize);
    if (drawingSize.x === width && drawingSize.y === height && renderer.getPixelRatio() === ratio)
      return false;
    renderer.setDrawingBufferSize(width, height, ratio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    return true;
  }

  return {
    scene,
    camera,
    resize,
    async loadTunnel(signal: AbortSignal) {
      const loaded = await loadBayTunnel(signal, renderer.capabilities.getMaxAnisotropy());
      if (disposed || signal.aborted) {
        loaded.dispose();
        return;
      }
      bay = loaded;
      scene.add(bay.root);
      bay.applySettings(settings);
      lastProgress = Number.NaN;
    },
    async prepare() {
      if (disposed) return;

      //
      // Compile both imported models behind the loader to avoid a hitch during their reveal.
      //
      await renderer.compileAsync(scene, camera);
    },
    invalidateShadows() {
      lastProgress = Number.NaN;
    },
    setVisualSettings(next: BayVisualSettings) {
      if (disposed) return;
      if (
        settings.sensorsVisible !== next.sensorsVisible ||
        settings.canopyVisible !== next.canopyVisible
      )
        lastProgress = Number.NaN;
      settings = next;
      bay?.applySettings(settings);
    },
    render(state: BayChoreographyState, exterior: CapturePresentationFrame) {
      if (disposed) return;
      sweep.update(exterior);
      bay?.setExteriorLight(exterior.color, exterior.brightness);
      key.intensity = 2.6 - state.focus * 0.2 + state.sensorEmphasis * 0.2;
      rim.intensity = 1.35 - state.focus * 0.15 + state.sensorEmphasis * 0.2;
      if (lastProgress !== state.entryProgress) {
        renderer.shadowMap.needsUpdate = true;
        lastProgress = state.entryProgress;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sweep.dispose();
      bay?.dispose();
      scene.environment = null;
      reflectionMap?.dispose();
      key.shadow.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
    },
  };
}
