/**
 * Prepares shaders and a complete first frame before signaling readiness, with optional externally cued playback.
 * Supports paused cache retention between routes; depends on scene, choreography, camera controller and vehicle ownership.
 */
import { createCapturePresentation, standbyLight, type BayCaptureLight } from './bayCaptureLight';
import { createBayScene } from './bayScene';
import { createBayChoreography, type BayPalette } from './bayChoreography';
import { createBayCameraController } from './bayCameraController';
import { loadBayVehicle, type BayVehicle } from './bayVehicle';
import { applyBayVehicle } from './bayPresentation';
import {
  defaultBayVisualSettings,
  normalizeBayVisualSettings,
  type BayVisualSettings,
} from './bayControls';

interface BayRuntimeOptions {
  initiallyParked: boolean;
  waitingOutside?: boolean;
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
  let settings = normalizeBayVisualSettings(options.visualSettings ?? defaultBayVisualSettings);
  stage.setVisualSettings(settings);
  const presentCapture = createCapturePresentation();
  let cameraPreset = options.palette.cameraPreset ?? 0;
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
  let captureLight = standbyLight;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;
  let prepared = false;
  let readyReported = false;
  let cameraInteractiveRequested = true;
  let waitingOutside = options.waitingOutside ?? false;

  let arrival: { resolve: () => void; reject: (reason: Error) => void } | undefined;

  function cancelArrival() {
    arrival?.reject(new Error('L’entrée du véhicule a été interrompue.'));
    arrival = undefined;
  }

  function failScene() {
    if (disposed || failed) return;
    failed = true;
    loading.abort();
    cameraController.setEnabled(false);
    synchronizeVisibility();
    // A failed renderer must release the entrance waiter so real capture remains available.
    choreography.skipIntro();
    arrival?.resolve();
    arrival = undefined;
    options.onError();
  }

  function startEntrance() {
    if (disposed || failed || !readyReported) return;
    choreography.enter();
    cameraController.setEnabled(cameraInteractiveRequested);
  }

  function requestRender() {
    if (disposed || failed || !visible || frame !== undefined) return;
    frame = requestAnimationFrame((timestamp) => {
      frame = undefined;
      if (disposed || failed || !visible) return;
      const deltaSeconds =
        lastFrameTime === undefined ? 1 / 60 : Math.max(0, (timestamp - lastFrameTime) / 1000);
      lastFrameTime = timestamp;
      if (vehicle) applyBayVehicle(vehicle, choreography.state.entryProgress);
      if (cinematicCamera) {
        cameraController.applyCinematic(choreography.state);
        if (
          choreography.state.introComplete &&
          (!waitingOutside || choreography.state.entryProgress === 0)
        )
          cinematicCamera = false;
      }
      const cameraMoving =
        !cinematicCamera && cameraController.update(Math.min(deltaSeconds, 0.05));
      const exterior = presentCapture(
        captureLight,
        Date.now(),
        deltaSeconds,
        reducedMotion,
        settings,
      );
      try {
        stage.render(choreography.state, exterior);
      } catch {
        failScene();
        return;
      }
      // Capture admission follows the frame containing the parked car, including reduced-motion entry.
      if (
        arrival &&
        vehicle &&
        choreography.state.entryProgress === 1 &&
        choreography.state.introComplete
      ) {
        cameraController.setEnabled(cameraInteractiveRequested);
        arrival.resolve();
        arrival = undefined;
      }
      if (prepared && vehicle && !readyReported) {
        //
        // Asset download alone is insufficient: only expose a frame after textures/shaders have actually rendered.
        //
        readyReported = true;
        options.onReady();
        if (options.autoStart !== false) startEntrance();
      }
      if (cameraMoving || exterior.animate) requestRender();
      else {
        lastFrameTime = undefined;
        if (exterior.wakeIn !== undefined && wakeTimer === undefined)
          wakeTimer = setTimeout(() => {
            wakeTimer = undefined;
            requestRender();
          }, exterior.wakeIn);
      }
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
  if (waitingOutside) {
    choreography.waitOutside();
    cameraController.setEnabled(true);
  }

  function synchronizeVisibility() {
    visible = !document.hidden && onScreen && active && !failed;
    choreography.setVisible(visible);
    cameraController.setVisible(visible);
    if (!visible) {
      clearTimeout(wakeTimer);
      wakeTimer = undefined;
      lastFrameTime = undefined;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    }
    if (visible) requestRender();
  }
  function resize() {
    if (disposed || failed || !active) return;
    if (stage.resize() === false) return;
    cameraController.resize();
    if (waitingOutside) cameraController.applyCinematic(choreography.state);
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

  const vehicleReady = loadBayVehicle(loading.signal).then((loadedVehicle) => {
    if (disposed || failed) {
      loadedVehicle.dispose();
      return;
    }
    vehicle = loadedVehicle;
    stage.scene.add(vehicle.root);
    stage.invalidateShadows();
    applyBayVehicle(vehicle, choreography.state.entryProgress);
  });
  void Promise.all([stage.loadTunnel(loading.signal), vehicleReady])
    .then(async () => {
      if (disposed || failed) return;
      cameraController.applyCinematic(choreography.state);
      await stage.prepare();
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
        cancelArrival();
        synchronizeVisibility();
        // Keep the waiting pose aligned with waitingOutside so reattachment cannot show a parked car.

        if (!waitingOutside) choreography.park();
        else if (choreography.state.entryProgress > 0) choreography.waitOutside();
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
    setCameraInteractive(interactive: boolean) {
      if (disposed || failed) return;
      cameraInteractiveRequested = interactive;
      cameraController.setEnabled(interactive && readyReported);
      if (interactive && readyReported && choreography.state.introComplete && !waitingOutside) {
        // Hand the settled pose to OrbitControls now, rather than waiting for a reset to synchronize it.
        cinematicCamera = false;
        cameraController.update(0);
      }
      requestRender();
    },
    replayEntrance(): Promise<void> {
      if (failed) return Promise.resolve();
      if (disposed || !readyReported || !active)
        return Promise.reject(new Error('La scène 3D n’est pas prête.'));
      cancelArrival();
      waitingOutside = false;
      // The existing view already follows the approach, or belongs to an operator who orbited it.
      cameraController.setEnabled(false);
      cinematicCamera = true;
      return new Promise<void>((resolve, reject) => {
        arrival = { resolve, reject };
        choreography.replayEntry(requestRender);
      });
    },
    setWaitingOutside(waiting: boolean) {
      if (disposed || failed || waitingOutside === waiting) return;
      waitingOutside = waiting;
      if (!waiting) {
        // A restored scan may already be running when its dossier arrives from the backend.
        choreography.park();
        cinematicCamera = true;
        requestRender();
        return;
      }
      cancelArrival();
      choreography.waitOutside(active && readyReported);
      cameraController.applyCinematic(choreography.state);
      cinematicCamera = true;
      cameraController.setEnabled(cameraInteractiveRequested && readyReported);
      requestRender();
    },
    skipIntro() {
      if (disposed || failed || !readyReported) return;
      choreography.skipIntro();
      requestRender();
    },
    resetCamera() {
      if (disposed || failed || !readyReported) return;
      if (waitingOutside) {
        cinematicCamera = true;
        cameraController.reset(true);
        cameraController.applyCinematic(choreography.state);
        requestRender();
        return;
      }
      if (!choreography.state.introComplete) choreography.skipIntro();
      cinematicCamera = false;
      cameraController.reset(reducedMotion);
      requestRender();
    },
    setPalette(palette: BayPalette) {
      if (disposed || failed) return;
      choreography.setPalette(palette);
      const preset = palette.cameraPreset ?? 0;
      if (preset !== cameraPreset && !cinematicCamera && !waitingOutside)
        cameraController.setCategory(preset, reducedMotion);
      cameraPreset = preset;
    },
    setCaptureLight(next: BayCaptureLight) {
      if (disposed || failed) return;
      captureLight = next;
      clearTimeout(wakeTimer);
      wakeTimer = undefined;
      requestRender();
    },
    setReducedMotion(nextReducedMotion: boolean) {
      if (disposed || failed) return;
      reducedMotion = nextReducedMotion;
      choreography.setReducedMotion(reducedMotion);
      cameraController.setReducedMotion(reducedMotion);
      requestRender();
    },
    setVisualSettings(next: BayVisualSettings) {
      if (disposed || failed) return;
      settings = normalizeBayVisualSettings(next);
      stage.setVisualSettings(settings);
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelArrival();
      loading.abort();
      clearTimeout(wakeTimer);
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
