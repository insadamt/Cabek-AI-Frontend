/** Verifies capture frame scheduling, visibility and reduced motion without WebGL; depends on runtime adapters. */
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

it('runs frames only for active visible capture and settles when reduced motion is enabled', async () => {
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
    park() {},
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
  expect(frames.size).toBe(0);
  runtime.setCapturing(true);
  flush(16);
  expect(frames.size).toBe(1);
  expect(adapters.stage.render.mock.calls.at(-1)[1]).toMatchObject({
    capturing: true,
    reducedMotion: false,
  });
  page.hidden = true;
  page.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(0);
  page.hidden = false;
  page.dispatchEvent(new Event('visibilitychange'));
  flush(1000);
  expect(frames.size).toBe(1);
  runtime.setReducedMotion(true);
  flush(1016);
  expect(frames.size).toBe(0);
  expect(adapters.stage.render.mock.calls.at(-1)[1]).toMatchObject({
    capturing: true,
    reducedMotion: true,
  });
  runtime.setCapturing(false);
  flush(1032);
  expect(frames.size).toBe(0);
  expect(adapters.stage.render.mock.calls.at(-1)[1].capturing).toBe(false);
});
