/**
 * Checks scene loading, camera ownership and bounded frame scheduling through runtime adapters.
 * Depends on real Three.js transforms, EventTargets and deterministic scene/camera/choreography
 * adapters; GPU rendering and actual pointer gestures remain manual verification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Color, Group, PerspectiveCamera } from 'three';
import { createBayRuntime } from './bayRuntime';
import { defaultBayVisualSettings } from './bayControls';
import type { BayChoreographyState, BayPalette } from './bayChoreography';
import type { BayVehicle } from './bayVehicle';

interface ChoreographyOptions {
  initiallyParked: boolean;
  reducedMotion: boolean;
  initialPalette: BayPalette;
  onChange: () => void;
  onIntroComplete?: () => void;
}
interface CameraOptions {
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  onChange: () => void;
  onManualInteraction: () => void;
}
const mocks = vi.hoisted(() => ({
  stage: undefined as unknown as ReturnType<typeof createStageAdapter>,
  choreography: undefined as unknown as ReturnType<typeof createChoreographyAdapter>,
  camera: undefined as unknown as ReturnType<typeof createCameraAdapter>,
  choreographyOptions: undefined as unknown as ChoreographyOptions,
  cameraOptions: undefined as unknown as CameraOptions,
  load: vi.fn(),
}));
vi.mock('./bayScene', () => ({ createBayScene: () => mocks.stage }));
vi.mock('./bayVehicle', () => ({ loadBayVehicle: (signal: AbortSignal) => mocks.load(signal) }));
vi.mock('./bayChoreography', () => ({
  createBayChoreography: (options: ChoreographyOptions) => {
    mocks.choreographyOptions = options;
    mocks.choreography = createChoreographyAdapter(options);
    return mocks.choreography;
  },
}));
vi.mock('./bayCameraController', () => ({
  createBayCameraController: (options: CameraOptions) => {
    mocks.cameraOptions = options;
    return mocks.camera;
  },
}));

function createStageAdapter() {
  return {
    camera: new PerspectiveCamera(32, 1.5),
    scene: new Group(),
    resize: vi.fn(),
    render: vi.fn(),
    invalidateShadows: vi.fn(),
    setVisualSettings: vi.fn(),
    loadTunnel: vi.fn(async () => {}),
    prepare: vi.fn(async () => {}),
    dispose: vi.fn(),
  };
}
function createCameraAdapter() {
  return {
    applyCinematic: vi.fn(),
    update: vi.fn((_deltaSeconds: number) => false),
    setEnabled: vi.fn(),
    setVisible: vi.fn(),
    setReducedMotion: vi.fn(),
    resize: vi.fn(),
    setCategory: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
  };
}
function createChoreographyAdapter(options: ChoreographyOptions) {
  const settled = options.initiallyParked || options.reducedMotion;
  const state: BayChoreographyState = {
    entryProgress: settled ? 1 : 0,
    revealProgress: settled ? 1 : 0,
    reframeProgress: settled ? 1 : 0,
    introComplete: settled,
    primary: new Color(options.initialPalette.primary),
    secondary: new Color(options.initialPalette.secondary),
    focus: 0,
    sensorEmphasis: 0,
  };
  function settleIntro() {
    Object.assign(state, {
      entryProgress: 1,
      revealProgress: 1,
      reframeProgress: 1,
      introComplete: true,
    });
    options.onChange();
  }
  return {
    state,
    enter: vi.fn(),
    setVisible: vi.fn(),
    setPalette: vi.fn(),
    dispose: vi.fn(),
    interruptCamera: vi.fn(() => {
      state.introComplete = true;
    }),
    skipIntro: vi.fn(settleIntro),
    park: vi.fn(settleIntro),
    setReducedMotion: vi.fn((reduced: boolean) => {
      if (reduced) settleIntro();
    }),
  };
}

const sessions: ReturnType<typeof createBayRuntime>[] = [];
function createSession({ reducedMotion = false, initiallyParked = false, autoStart = true } = {}) {
  const page = Object.assign(new EventTarget(), { hidden: false });
  const canvas = new EventTarget();
  const resizeDisconnect = vi.fn();
  const intersectionDisconnect = vi.fn();
  let resizeObserved!: () => void;
  let setIntersection!: (entries: { isIntersecting: boolean }[]) => void;
  vi.stubGlobal('document', page);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resizeObserved = callback;
      }
      observe() {}
      disconnect = resizeDisconnect;
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof setIntersection) {
        setIntersection = callback;
      }
      observe() {}
      disconnect = intersectionDisconnect;
    },
  );
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let timestamp = 0;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  mocks.stage = createStageAdapter();
  mocks.camera = createCameraAdapter();
  let resolveVehicle!: (vehicle: BayVehicle) => void;
  let rejectVehicle!: (error: Error) => void;
  mocks.load.mockImplementation(
    () =>
      new Promise<BayVehicle>((resolve, reject) => {
        resolveVehicle = resolve;
        rejectVehicle = reject;
      }),
  );
  const ready = vi.fn();
  const error = vi.fn();
  const onIntroComplete = vi.fn();
  const runtime = createBayRuntime(canvas as HTMLCanvasElement, {
    initiallyParked,
    autoStart,
    reducedMotion,
    palette: { primary: '#b4e86b', secondary: '#d7f5aa' },
    onReady: ready,
    onError: error,
    onIntroComplete,
  });
  sessions.push(runtime);
  const vehicle = { root: new Group(), wheels: [], dispose: vi.fn() } as unknown as BayVehicle;
  async function finishLoading(fail = false) {
    if (fail) rejectVehicle(new Error('Model unavailable'));
    else resolveVehicle(vehicle);
    for (let step = 0; step < 5; step++) await Promise.resolve();
  }
  function flushFrame(elapsed = 1000 / 60) {
    timestamp += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(timestamp));
  }
  function hide(hidden: boolean) {
    page.hidden = hidden;
    page.dispatchEvent(new Event('visibilitychange'));
  }
  return {
    runtime,
    canvas,
    vehicle,
    ready,
    error,
    onIntroComplete,
    finishLoading,
    frames,
    flushFrame,
    hide,
    resizeDisconnect,
    intersectionDisconnect,
    resize: () => resizeObserved(),
    intersect: (visible: boolean) => setIntersection([{ isIntersecting: visible }]),
    completeIntro: () => {
      Object.assign(mocks.choreography.state, {
        entryProgress: 1,
        revealProgress: 1,
        reframeProgress: 1,
        introComplete: true,
      });
      mocks.choreographyOptions.onIntroComplete?.();
      mocks.choreographyOptions.onChange();
    },
  };
}

beforeEach(() => {
  mocks.load.mockReset();
});
afterEach(() => {
  sessions.splice(0).forEach((runtime) => runtime.dispose());
  vi.unstubAllGlobals();
});

// ============================================================
// Loading and exclusive camera ownership
// ============================================================

describe('3D bay runtime ownership', () => {
  it('enables the first drag on page readiness without a reset or vehicle playback', async () => {
    const session = createSession({ initiallyParked: true, autoStart: false });
    session.runtime.setCameraInteractive(true);
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(false);
    await session.finishLoading();
    session.flushFrame();
    session.runtime.setCameraInteractive(true);
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(true);
    expect(mocks.camera.reset).not.toHaveBeenCalled();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    mocks.cameraOptions.onManualInteraction();
    session.flushFrame();
    expect(mocks.camera.update).toHaveBeenCalled();
    session.runtime.setCameraInteractive(false);
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(false);
  });
  it('starts only after the attached vehicle is prepared and a complete frame has rendered', async () => {
    const session = createSession();
    expect(mocks.cameraOptions.camera).toBe(mocks.stage.camera);
    expect(mocks.cameraOptions.canvas).toBe(session.canvas);
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(false);
    session.runtime.enter();
    session.runtime.skipIntro();
    session.runtime.resetCamera();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    expect(mocks.choreography.skipIntro).not.toHaveBeenCalled();
    expect(mocks.camera.reset).not.toHaveBeenCalled();
    await session.finishLoading();
    expect(mocks.stage.scene.children).toEqual([session.vehicle.root]);
    expect(mocks.stage.invalidateShadows).toHaveBeenCalledOnce();
    expect(mocks.stage.prepare).toHaveBeenCalledOnce();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    expect(session.ready).not.toHaveBeenCalled();
    session.flushFrame();
    expect(mocks.choreography.enter).toHaveBeenCalledOnce();
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(true);
    expect(session.ready).toHaveBeenCalledOnce();
    expect(mocks.camera.applyCinematic).toHaveBeenCalledWith(mocks.choreography.state);
    expect(mocks.camera.update).not.toHaveBeenCalled();
  });
  it('hands the final cinematic pose to orbit controls once and renders only requested damping frames', async () => {
    const session = createSession();
    await session.finishLoading();
    session.flushFrame();
    session.completeIntro();
    mocks.camera.update.mockReturnValueOnce(true).mockReturnValueOnce(false);
    session.flushFrame();
    expect(session.onIntroComplete).toHaveBeenCalledOnce();
    expect(session.frames.size).toBe(1);
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(3);
    session.flushFrame(1000);
    expect(mocks.camera.update).toHaveBeenLastCalledWith(0.05);
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(3);
    expect(session.frames.size).toBe(0);
    const palette = { primary: '#51d9db', secondary: '#afedef', cameraPreset: 2 };
    session.runtime.setPalette(palette);
    expect(mocks.choreography.setPalette).toHaveBeenCalledWith(palette);
    expect(mocks.camera.setCategory).toHaveBeenCalledWith(2, false);
    session.runtime.setPalette({ ...palette, focus: 1, sensorEmphasis: 1 });
    expect(mocks.camera.setCategory).toHaveBeenCalledOnce();
  });
  it('preserves manual ownership during vehicle motion and reduced motion, then resets explicitly', async () => {
    const session = createSession();
    await session.finishLoading();
    session.flushFrame();
    mocks.choreography.state.entryProgress = 0.4;
    mocks.cameraOptions.onManualInteraction();
    expect(mocks.choreography.interruptCamera).toHaveBeenCalledOnce();
    session.flushFrame();
    expect(session.vehicle.root.position.z).toBeCloseTo(7.2 * 0.6);
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(2);
    session.runtime.setReducedMotion(true);
    session.flushFrame();
    expect(session.vehicle.root.position.z).toBe(0);
    expect(mocks.camera.setReducedMotion).toHaveBeenLastCalledWith(true);
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(2);
    session.runtime.resetCamera();
    expect(mocks.camera.reset).toHaveBeenCalledWith(true);
    session.flushFrame();
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(2);
  });
  it('settles the full cinematic camera when reduced motion changes during intro or loading', async () => {
    const session = createSession();
    session.runtime.setReducedMotion(true);
    expect(mocks.choreography.setReducedMotion).toHaveBeenCalledWith(true);
    await session.finishLoading();
    session.flushFrame();
    expect(session.vehicle.root.position.z).toBe(0);
    expect(mocks.camera.applyCinematic).toHaveBeenCalledWith(
      expect.objectContaining({ revealProgress: 1, reframeProgress: 1 }),
    );
    expect(mocks.camera.update).toHaveBeenCalledOnce();
    expect(session.frames.size).toBe(0);
  });
  it('skips before reset and keeps a reset tween under the camera controller ownership', async () => {
    const session = createSession();
    await session.finishLoading();
    session.flushFrame();
    session.runtime.resetCamera();
    expect(mocks.choreography.skipIntro).toHaveBeenCalledOnce();
    expect(mocks.camera.reset).toHaveBeenCalledWith(false);
    session.flushFrame();
    expect(mocks.camera.applyCinematic).toHaveBeenCalledTimes(2);
    session.resize();
    expect(mocks.stage.resize).toHaveBeenCalledTimes(2);
    expect(mocks.camera.resize).toHaveBeenCalledTimes(2);
  });
  it('cancels hidden or offscreen frames and resumes without an idle render loop', async () => {
    const session = createSession({ initiallyParked: true });
    await session.finishLoading();
    session.hide(true);
    mocks.choreographyOptions.onChange();
    mocks.cameraOptions.onChange();
    expect(session.frames.size).toBe(0);
    expect(mocks.choreography.setVisible).toHaveBeenLastCalledWith(false);
    expect(mocks.camera.setVisible).toHaveBeenLastCalledWith(false);
    session.hide(false);
    session.intersect(false);
    expect(session.frames.size).toBe(0);
    session.intersect(true);
    expect(session.frames.size).toBe(1);
    session.flushFrame();
    expect(mocks.stage.render).toHaveBeenCalledOnce();
    expect(session.frames.size).toBe(0);
    mocks.cameraOptions.onChange();
    mocks.cameraOptions.onChange();
    expect(session.frames.size).toBe(1);
    session.runtime.setActive(false);
    const resizeCount = mocks.stage.resize.mock.calls.length;
    session.resize();
    session.intersect(true);
    session.hide(false);
    expect(session.frames.size).toBe(0);
    expect(mocks.stage.resize).toHaveBeenCalledTimes(resizeCount);
    expect(mocks.choreography.park).toHaveBeenCalledOnce();
    expect(session.vehicle.dispose).not.toHaveBeenCalled();
    session.runtime.setActive(true);
    expect(session.frames.size).toBe(1);
    session.flushFrame();
    expect(mocks.load).toHaveBeenCalledOnce();
    expect(mocks.stage.prepare).toHaveBeenCalledOnce();
    expect(session.ready).toHaveBeenCalledOnce();
  });

  it('updates hidden visual settings and renders them only on return', () => {
    const session = createSession();
    expect(mocks.stage.setVisualSettings).toHaveBeenCalledWith(defaultBayVisualSettings);
    session.flushFrame();
    session.hide(true);
    const settings = { illumination: 0.4, sensorsVisible: false, canopyVisible: false };
    session.runtime.setVisualSettings(settings);
    expect(mocks.stage.setVisualSettings).toHaveBeenLastCalledWith({
      ...defaultBayVisualSettings,
      ...settings,
    });
    expect(session.frames.size).toBe(0);
    session.hide(false);
    session.flushFrame();
    expect(session.frames.size).toBe(0);
  });

  it('releases late vehicle loads and every owned resource once after leaving', async () => {
    const session = createSession();
    const signal = mocks.load.mock.calls[0][0] as AbortSignal;
    session.runtime.dispose();
    session.runtime.dispose();
    await session.finishLoading();
    expect(signal.aborted).toBe(true);
    expect(session.vehicle.dispose).toHaveBeenCalledOnce();
    expect(mocks.stage.scene.children).toHaveLength(0);
    expect(session.ready).not.toHaveBeenCalled();
    for (const dispose of [
      mocks.stage.dispose,
      mocks.choreography.dispose,
      mocks.camera.dispose,
      session.resizeDisconnect,
      session.intersectionDisconnect,
    ]) {
      expect(dispose).toHaveBeenCalledOnce();
    }
    mocks.cameraOptions.onManualInteraction();
    mocks.cameraOptions.onChange();
    session.hide(true);
    expect(mocks.choreography.interruptCamera).not.toHaveBeenCalled();
    expect(session.frames.size).toBe(0);
  });

  it.each(['context loss', 'model rejection', 'shader preparation', 'first frame'])(
    'stops the camera and scene after %s while ignoring later actions',
    async (failure) => {
      const session = createSession();
      if (failure === 'context loss') {
        const lost = new Event('webglcontextlost', { cancelable: true });
        session.canvas.dispatchEvent(lost);
        expect(lost.defaultPrevented).toBe(true);
        await session.finishLoading();
        expect(session.vehicle.dispose).toHaveBeenCalledOnce();
      } else if (failure === 'shader preparation' || failure === 'first frame') {
        if (failure === 'shader preparation')
          mocks.stage.prepare.mockRejectedValueOnce(new Error('Shader failure'));
        else
          mocks.stage.render.mockImplementationOnce(() => {
            throw new Error('Frame failure');
          });
        await session.finishLoading();
        session.flushFrame();
      } else await session.finishLoading(true);
      expect(session.error).toHaveBeenCalledOnce();
      expect(session.ready).not.toHaveBeenCalled();
      if (failure === 'context loss' || failure === 'model rejection')
        expect(mocks.stage.scene.children).toHaveLength(0);
      expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(false);
      expect(mocks.camera.setVisible).toHaveBeenLastCalledWith(false);
      session.runtime.resetCamera();
      session.runtime.setPalette({ primary: '#fff', secondary: '#fff' });
      session.runtime.setReducedMotion(true);
      session.runtime.setVisualSettings({ ...defaultBayVisualSettings, canopyVisible: false });
      expect(mocks.camera.reset).not.toHaveBeenCalled();
      expect(mocks.choreography.setPalette).not.toHaveBeenCalled();
      expect(mocks.stage.setVisualSettings).toHaveBeenCalledOnce();
      expect(session.frames.size).toBe(0);
    },
  );

  it('holds readiness during shader preparation, then waits for the page cue before playback', async () => {
    const session = createSession({ autoStart: false });
    let finishPreparation!: () => void;
    mocks.stage.prepare.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishPreparation = resolve;
      }),
    );
    await session.finishLoading();
    session.flushFrame();
    session.runtime.enter();
    expect(session.ready).not.toHaveBeenCalled();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    finishPreparation();
    await Promise.resolve();
    session.flushFrame();
    expect(session.ready).toHaveBeenCalledOnce();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(false);
    session.runtime.enter();
    expect(mocks.choreography.enter).toHaveBeenCalledOnce();
    expect(mocks.camera.setEnabled).toHaveBeenLastCalledWith(true);
  });

  it('ignores preparation completion after leaving the scene', async () => {
    const session = createSession({ autoStart: false });
    let finishPreparation!: () => void;
    mocks.stage.prepare.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishPreparation = resolve;
      }),
    );
    await session.finishLoading();
    session.runtime.dispose();
    finishPreparation();
    await Promise.resolve();
    session.flushFrame();
    expect(session.ready).not.toHaveBeenCalled();
    expect(mocks.choreography.enter).not.toHaveBeenCalled();
    expect(session.vehicle.dispose).toHaveBeenCalledOnce();
    expect(session.frames.size).toBe(0);
  });
});
