/** Prevents outgoing-page flashes at route commit while preserving immediate cancellation; depends on real GSAP timelines and a controlled animation frame. */
import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runJourneyMotion } from './journeyMotion';

function fixture(reduced = false, preserveLaunch = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('matchMedia', () => media);
  let frame: FrameRequestCallback | undefined;
  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  const cancelFrame = vi.fn();
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      requestAnimationFrame: requestFrame,
      cancelAnimationFrame: cancelFrame,
    }),
  );
  const source = { opacity: 1 };
  const restore = vi.fn();
  const complete = vi.fn();
  const cancel = vi.fn();
  const stop = runJourneyMotion({
    deferRestore: true,
    preserveLaunch,
    build: (timeline) => {
      timeline.to(source, { opacity: 0, duration: 0.4 });
    },
    restore,
    onComplete: complete,
    onCancel: cancel,
  });
  const timeline = gsap.globalTimeline
    .getChildren()
    .find((child) => child instanceof gsap.core.Timeline) as gsap.core.Timeline;
  return {
    source,
    restore,
    complete,
    cancel,
    stop,
    timeline,
    requestFrame,
    cancelFrame,
    flushFrame: (time = 0) => {
      const callback = frame;
      frame = undefined;
      callback?.(time);
    },
  };
}
afterEach(() => {
  gsap.globalTimeline.clear();
  vi.unstubAllGlobals();
});
describe('outgoing journey cleanup', () => {
  it('does not skip the launch when first rendering stalls for 450 ms', () => {
    const view = fixture(false, true);
    view.flushFrame(1000);
    view.flushFrame(1450);
    expect(view.timeline.time()).toBeCloseTo(1 / 30);
    expect(view.source.opacity).toBeGreaterThan(0.8);
    expect(view.complete).not.toHaveBeenCalled();
    view.stop();
    expect(view.cancelFrame).toHaveBeenCalledOnce();
    expect(view.source.opacity).toBe(1);
  });
  it('still completes once when advancing on rendered frames', () => {
    const view = fixture(false, true);
    view.flushFrame(0);
    for (let time = 16; time <= 416; time += 16) view.flushFrame(time);
    expect(view.complete).toHaveBeenCalledOnce();
    view.flushFrame(432);
    expect(view.restore).toHaveBeenCalledOnce();
    expect(view.source.opacity).toBe(1);
  });
  it('keeps the completed exit hidden through route commit and restores it in the next frame', () => {
    const view = fixture();
    view.timeline.progress(1);
    expect(view.complete).toHaveBeenCalledOnce();
    expect(view.source.opacity).toBe(0);
    expect(view.restore).not.toHaveBeenCalled();
    view.flushFrame();
    expect(view.source.opacity).toBe(1);
    expect(view.restore).toHaveBeenCalledOnce();
  });
  it('restores immediately when the user cancels instead of committing a route', () => {
    const view = fixture();
    view.timeline.time(0.2);
    view.stop();
    expect(view.source.opacity).toBe(1);
    expect(view.restore).toHaveBeenCalledOnce();
    expect(view.requestFrame).not.toHaveBeenCalled();
    expect(view.cancel).toHaveBeenCalledOnce();
    expect(view.complete).not.toHaveBeenCalled();
  });
  it('settles reduced motion without holding an invisible source for another frame', () => {
    const view = fixture(true);
    expect(view.source.opacity).toBe(1);
    expect(view.restore).toHaveBeenCalledOnce();
    expect(view.complete).toHaveBeenCalledOnce();
    expect(view.requestFrame).not.toHaveBeenCalled();
  });
});
