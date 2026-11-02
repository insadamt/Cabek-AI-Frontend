/**
 * Prepares shaders and a complete first frame before signaling readiness, with optional externally cued playback.
 * Supports paused cache retention between routes; depends on scene, choreography, camera controller and vehicle ownership.
 */
import { createBayScene } from './bayScene';
import { createBayChoreography, type BayPalette } from './bayChoreography';
import { createBayCameraController } from './bayCameraController';
import { loadBayVehicle, type BayVehicle } from './bayVehicle';
import { applyBayVehicle } from './bayPresentation';
import { defaultBayVisualSettings, type BayVisualSettings } from './bayControls';

interface BayRuntimeOptions {
  initiallyParked: boolean;
  reducedMotion: boolean;
  palette: BayPalette;
  visualSettings?: BayVisualSettings;
  autoStart?: boolean;
  active?: boolean;
  onReady: () => void;
  onError: () => void;
  onIntroComplete?: () => void;
}

export function createBayRuntime(canvas: HTMLCanvasElement, options: BayRuntimeOptions) {
  const stage = createBayScene(canvas);
  stage.setVisualSettings(options.visualSettings ?? defaultBayVisualSettings);
  const loading = new AbortController();
  let disposed = false;
  let failed = false;
  let onScreen = true;
  let active = options.active ?? true;
  let visible = !document.hidden && active;
  let frame: number | undefined;
  let lastFrameTime: number | undefined;
  let vehicle: BayVehicle | undefined;
  let cinematicCamera = true;
  let reducedMotion = options.reducedMotion;
  let prepared = false;
  let readyReported = false;

  function failScene() {
    if (disposed || failed) return;
    failed = true;
    cameraController.setEnabled(false);
    synchronizeVisibility();
    options.onError();
  }

  function startEntrance() {
    if (disposed || failed || !readyReported) return;
    choreography.enter();
    cameraController.setEnabled(true);
  }

  function requestRender() {
    if (disposed || failed || !visible || frame !== undefined) return;
    frame = requestAnimationFrame((timestamp) => {
      frame = undefined;
      if (disposed || failed || !visible) return;
      const deltaSeconds =
        lastFrameTime === undefined ? 1 / 60 : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
      lastFrameTime = timestamp;
      if (vehicle) applyBayVehicle(vehicle, choreography.state.entryProgress);
      if (cinematicCamera) {
        cameraController.applyCinematic(choreography.state);
        if (choreography.state.introComplete) cinematicCamera = false;
      }
      const cameraMoving = !cinematicCamera && cameraController.update(deltaSeconds);
      try {
        stage.render(choreography.state);
      } catch {
        failScene();
        return;
      }
      if (prepared && vehicle && !readyReported) {
        //
        // Asset download alone is insufficient: only expose a frame after textures/shaders have actually rendered.
        //
        readyReported = true;
        options.onReady();
        if (options.autoStart !== false) startEntrance();
      }
      if (cameraMoving) requestRender();
      else lastFrameTime = undefined;
    });
  }

  const choreography = createBayChoreography({
    initiallyParked: options.initiallyParked,
    reducedMotion,
    initialPalette: options.palette,
    onChange: requestRender,
    onIntroComplete: options.onIntroComplete,
  });
  const cameraController = createBayCameraController({
    camera: stage.camera,
    canvas,
    onChange: requestRender,
    onManualInteraction() {
      if (disposed || failed) return;

      //
      // Capture-phase input transfers ownership before OrbitControls processes the same drag or wheel event.
      //
      cinematicCamera = false;
      choreography.interruptCamera();
      requestRender();
    },
  });
  cameraController.setEnabled(false);
  cameraController.setReducedMotion(reducedMotion);

  function synchronizeVisibility() {
    visible = !document.hidden && onScreen && active && !failed;
    choreography.setVisible(visible);
    cameraController.setVisible(visible);
    if (!visible) {
      lastFrameTime = undefined;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    }
    if (visible) requestRender();
  }
  function resize() {
    if (disposed || failed || !active) return;
    stage.resize();
    cameraController.resize();
    requestRender();
  }
  function handleContextLoss(event: Event) {
    event.preventDefault();
    failScene();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver((entries) => {
          onScreen = entries[0]?.isIntersecting ?? true;
          synchronizeVisibility();
        });
  intersectionObserver?.observe(canvas);
  document.addEventListener('visibilitychange', synchronizeVisibility);
  canvas.addEventListener('webglcontextlost', handleContextLoss);
  synchronizeVisibility();
  resize();

  void loadBayVehicle(loading.signal)
    .then(async (loadedVehicle) => {
      if (disposed || failed) {
        loadedVehicle.dispose();
        return;
      }
      vehicle = loadedVehicle;
      stage.scene.add(vehicle.root);
      stage.invalidateShadows();
      applyBayVehicle(vehicle, choreography.state.entryProgress);
      cameraController.applyCinematic(choreography.state);
      await stage.prepare(choreography.state);
      if (disposed || failed) return;
      prepared = true;
      requestRender();
    })
    .catch(failScene);

  return {
    setActive(nextActive: boolean) {
      if (disposed || failed || active === nextActive) return;
      active = nextActive;
      if (!active) {
        synchronizeVisibility();
        choreography.park();
        return;
      }

      //
      // A reattached cached canvas must use its real viewport before the first visible frame.
      //
      onScreen = true;
      resize();
      synchronizeVisibility();
    },
    enter() {
      startEntrance();
    },
    skipIntro() {
      if (disposed || failed || !readyReported) return;
      choreography.skipIntro();
      requestRender();
    },
    resetCamera() {
      if (disposed || failed || !readyReported) return;
      if (!choreography.state.introComplete) choreography.skipIntro();
      cinematicCamera = false;
      cameraController.reset(reducedMotion);
      requestRender();
    },
    setPalette(palette: BayPalette) {
      if (disposed || failed) return;
      choreography.setPalette(palette);
      if (!cinematicCamera) cameraController.setCategory(palette.cameraPreset ?? 0, reducedMotion);
    },
    setCapturing(capturing: boolean) {
      if (disposed || failed) return;
      cameraController.setCapturing(capturing);
      requestRender();
    },
    setReducedMotion(nextReducedMotion: boolean) {
      if (disposed || failed) return;
      reducedMotion = nextReducedMotion;
      choreography.setReducedMotion(reducedMotion);
      cameraController.setReducedMotion(reducedMotion);
    },
    setVisualSettings(settings: BayVisualSettings) {
      if (disposed || failed) return;
      stage.setVisualSettings(settings);
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loading.abort();
      if (frame !== undefined) cancelAnimationFrame(frame);
      choreography.dispose();
      cameraController.dispose();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', synchronizeVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      vehicle?.dispose();
      stage.dispose();
    },
  };
}
