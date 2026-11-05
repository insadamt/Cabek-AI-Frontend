/** Verifies folder travel, asynchronous handoff and interruption cleanup using real GSAP timelines and frozen artwork stubs. */
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flights = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./folderFlight', () => ({ createFolderFlight: flights.create }));
import { prepareCollectionSwitch } from './homeCollectionMotion';

function folder(id: string, left: number, width: number) {
  return {
    dataset: { dossierId: id },
    style: { visibility: '', transform: 'native folder pose' },
    offsetWidth: 400,
    offsetHeight: 300,
    getClientRects: () => [1],
    getBoundingClientRect: () => ({
      left,
      top: 100,
      width,
      height: width * 0.75,
      right: left + width,
      bottom: 100 + width * 0.75,
    }),
    closest: () => null,
  };
}

function fixture(sourceCount = 3) {
  const sources = Array.from({ length: sourceCount }, (_, index) =>
    folder(String(index), index * 250, 240),
  );
  const targets = sources.map((source, index) =>
    folder(source.dataset.dossierId, index * 170, 140),
  );
  let current = sources;
  let notify = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  const scope = {
    dataset: {} as Record<string, string>,
    inert: false,
    clientWidth: 1000,
    getBoundingClientRect: () => ({ left: 0, right: 1000, top: 0, bottom: 600 }),
    querySelectorAll: (selector: string) => (selector.startsWith('.dossier-folder') ? current : []),
  };
  const layers: Array<{
    style: Record<string, string>;
    firstElementChild: { style: Record<string, string> };
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
    remove: ReturnType<typeof vi.fn>;
  }> = [];
  flights.create.mockImplementation(() => {
    const layer = {
      style: {},
      firstElementChild: { style: {} },
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      remove: vi.fn(),
    };
    layers.push(layer);
    return layer;
  });
  const transition = prepareCollectionSwitch(scope as unknown as HTMLElement);
  return {
    sources,
    targets,
    layers,
    scope,
    transition,
    disconnect,
    showTargets: () => {
      current = targets;
    },
    showLoading: () => {
      current = [];
    },
    notify: () => notify(),
  };
}

function timeline() {
  return gsap.globalTimeline
    .getChildren()
    .find((child) => child instanceof gsap.core.Timeline) as gsap.core.Timeline;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  gsap.globalTimeline.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('collection layout handoff', () => {
  it('moves matching folders at native text size and restores the real artwork on completion', () => {
    const view = fixture();
    expect(view.scope.inert).toBe(true);
    expect(view.layers[0].firstElementChild.style.width).toBe('400px');
    expect(view.layers[0].firstElementChild.style.transform).toBe('scale(0.6, 0.6)');
    view.showTargets();
    view.transition.play();
    expect(view.targets.every((target) => target.style.visibility === 'hidden')).toBe(true);
    timeline().time(0.22, false);
    expect(view.layers[0].scaleX).toBeLessThan(1);
    expect(view.layers[0].scaleX).toBeGreaterThan(140 / 240);
    expect(view.targets.every((target) => target.style.transform === 'native folder pose')).toBe(
      true,
    );
    timeline().progress(1);
    expect(view.layers.every((layer) => layer.remove.mock.calls.length === 1)).toBe(true);
    expect(view.targets.every((target) => target.style.visibility === '')).toBe(true);
    expect(view.scope.inert).toBe(false);
    expect(view.scope.dataset.collectionSwitch).toBeUndefined();
    view.transition.finish();
  });

  it('waits for asynchronously mounted results and measures their final layout', () => {
    const view = fixture();
    view.showLoading();
    view.transition.play();
    expect(timeline()).toBeUndefined();
    view.showTargets();
    view.notify();
    expect(view.disconnect).toHaveBeenCalled();
    expect(view.targets.every((target) => target.style.visibility === 'hidden')).toBe(true);
    timeline().progress(1);
    expect(view.layers[0].scaleX).toBeCloseTo(140 / 240);
    view.transition.finish();
  });

  it('bounds the loading wait and releases interaction after a slow or failed read', () => {
    vi.useFakeTimers();
    const view = fixture();
    view.showLoading();
    view.transition.play();
    vi.advanceTimersByTime(650);
    timeline().progress(1);
    expect(view.scope.inert).toBe(false);
    expect(view.disconnect).toHaveBeenCalled();
    expect(view.layers.every((layer) => layer.remove.mock.calls.length === 1)).toBe(true);
    view.transition.finish();
  });

  it.each(['waiting', 'moving'])('cleans up once when interrupted while %s', (phase) => {
    const view = fixture();
    if (phase === 'waiting') view.showLoading();
    else view.showTargets();
    view.transition.play();
    view.transition.finish();
    view.transition.finish();
    view.notify();
    expect(view.layers.every((layer) => layer.remove.mock.calls.length === 1)).toBe(true);
    expect(view.targets.every((target) => target.style.visibility === '')).toBe(true);
    expect(view.scope.inert).toBe(false);
  });

  it('caps frozen artwork at three folders even for a large grid', () => {
    const view = fixture(20);
    expect(view.layers).toHaveLength(3);
    view.transition.finish();
  });

  it('releases an empty collection without creating an empty flight timeline', () => {
    vi.useFakeTimers();
    const view = fixture(0);
    view.transition.play();
    vi.advanceTimersByTime(650);
    expect(view.scope.inert).toBe(false);
    expect(timeline()).toBeUndefined();
    view.transition.finish();
  });
});
