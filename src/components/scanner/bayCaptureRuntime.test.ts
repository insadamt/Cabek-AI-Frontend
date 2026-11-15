/** Verifies capture scheduling and cached waiting poses without WebGL; depends on runtime adapters. */
import { afterEach, expect, it, vi } from 'vitest';
import { Group, PerspectiveCamera } from 'three';
import { createBayRuntime } from './bayRuntime';

const adapters = vi.hoisted(() => ({ stage: null as any, choreography: null as any }));
vi.mock('./bayScene', () => ({ createBayScene: () => adapters.stage }));
vi.mock('./bayVehicle', () => ({
  loadBayVehicle: async () => ({ root: new Group(), wheels: [], dispose() {} }),
}));
vi.mock('./bayCameraController', () => ({
  createBayCameraController: () => ({
    setEnabled() {},
    setReducedMotion() {},
    setVisible() {},
    applyCinematic() {},
    reset() {},
    update: () => false,
    resize() {},
    dispose() {},
  }),
}));
vi.mock('./bayChoreography', () => ({ createBayChoreography: () => adapters.choreography }));
let runtime: ReturnType<typeof createBayRuntime>;
afterEach(() => {
  runtime?.dispose();
  vi.unstubAllGlobals();
});

async function prepareRuntime() {
  const page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', page);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('IntersectionObserver', undefined);
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++next, callback);
    return next;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  adapters.stage = {
    scene: new Group(),
    camera: new PerspectiveCamera(),
    resize() {},
    loadTunnel: vi.fn(async () => {}),
    prepare: async () => {},
    invalidateShadows() {},
    setVisualSettings() {},
    render: vi.fn(),
    dispose() {},
  };
  adapters.choreography = {
    state: { entryProgress: 1, introComplete: true },
    enter() {},
    setVisible() {},
    setReducedMotion() {},
    park: vi.fn(() => {
      adapters.choreography.state.entryProgress = 1;
    }),
    waitOutside() {
      adapters.choreography.state.entryProgress = 0;
    },
    dispose() {},
  };
  runtime = createBayRuntime(new EventTarget() as HTMLCanvasElement, {
    initiallyParked: true,
    reducedMotion: false,
    palette: { primary: '#abc', secondary: '#def' },
    onReady() {},
    onError() {},
  });
  for (let i = 0; i < 6; i++) await Promise.resolve();
  function flush(time: number) {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(time));
  }
  flush(0);
  return { page, frames, flush };
}

it('retains the waiting vehicle outside across repeated cached route returns', async () => {
  const { frames, flush } = await prepareRuntime();
  runtime.setWaitingOutside(true);
  flush(16);

  for (let visit = 0; visit < 3; visit++) {
    runtime.setActive(false);
    expect(frames.size).toBe(0);
    runtime.setWaitingOutside(true);
    runtime.setActive(true);
    flush(32 + visit * 16);
    expect(adapters.choreography.state.entryProgress).toBe(0);
  }

  expect(adapters.choreography.park).not.toHaveBeenCalled();
});

it('animates only while visible and lets the same scene settle after a capture', async () => {
  const { page, frames, flush } = await prepareRuntime();
  runtime.setCaptureLight({ status: 'capturing' });
  flush(16);
  expect(frames.size).toBe(1);
  for (let time = 32; time < 1050; time += 16) flush(time);
  const displayed = () => adapters.stage.render.mock.calls.at(-1)[1];
  expect(displayed().color.getHexString()).toBe('ff0000');
  const depth = displayed().sweepDepth;
  page.hidden = true;
  page.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(0);
  page.hidden = false;
  page.dispatchEvent(new Event('visibilitychange'));
  flush(5000);
  expect(Math.abs(displayed().sweepDepth - depth)).toBeLessThan(0.1);
  runtime.setCaptureLight({ status: 'failed' });
  for (let time = 5016; time < 6000; time += 16) flush(time);
  expect(displayed().color.getHexString()).toBe('ff9800');
  expect(displayed().sweepOpacity).toBe(0);
  expect(frames.size).toBe(0);
  expect(adapters.stage.loadTunnel).toHaveBeenCalledOnce();
});

it('releases capture only after rendering the parked car, even if the camera finishes early', async () => {
  const { flush } = await prepareRuntime();
  runtime.setWaitingOutside(true);
  flush(16);
  const vehicle = adapters.stage.scene.children[0];
  expect(vehicle.position.z).toBe(7.2);
  adapters.choreography.replayEntry = (notify: () => void) => {
    adapters.choreography.state.introComplete = true;
    notify();
  };
  const admitted = vi.fn();
  const admission = runtime.replayEntrance().then(admitted);
  adapters.choreography.state.entryProgress = 0.4;
  flush(32);
  await Promise.resolve();
  expect(vehicle.position.z).toBeCloseTo(4.32);
  expect(admitted).not.toHaveBeenCalled();
  adapters.choreography.state.entryProgress = 1;
  runtime.setCameraInteractive(false);
  expect(admitted).not.toHaveBeenCalled();
  flush(48);
  await admission;
  expect(vehicle.position.z).toBe(0);
  expect(admitted).toHaveBeenCalledOnce();
});

it('places the car inside when an active backend scan is restored over a waiting scene', async () => {
  const { flush } = await prepareRuntime();
  runtime.setWaitingOutside(true);
  flush(16);
  runtime.setWaitingOutside(false);
  runtime.setCaptureLight({ status: 'capturing' });
  flush(32);
  expect(adapters.stage.scene.children[0].position.z).toBe(0);
  expect(adapters.stage.render.mock.lastCall[1].sweepOpacity).toBeGreaterThan(0);
});
