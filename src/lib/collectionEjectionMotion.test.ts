/** Guards visible island ejection, native carousel transforms and safe interruption without browser rendering. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const motion = vi.hoisted(() => ({
  callback: undefined as (() => void) | undefined,
  timeline: {
    to: vi.fn(),
    fromTo: vi.fn(),
    eventCallback: vi.fn(),
    progress: vi.fn(),
    play: vi.fn(),
    kill: vi.fn(),
  },
  set: vi.fn(),
  getProperty: vi.fn(),
}));
vi.mock('gsap', () => ({
  default: {
    timeline: () => motion.timeline,
    set: motion.set,
    getProperty: motion.getProperty,
  },
}));
import { ejectCollectionFolders } from './collectionEjectionMotion';

function fixture(count = 3, reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('window', new EventTarget());
  const slots = Array.from({ length: count }, (_, index) => ({
    classList: { contains: () => index === 1 },
    style: { transition: 'transform .6s' },
    getBoundingClientRect: () => ({ left: index * 400, top: 300, width: 300, height: 220 }),
  }));
  const controls = [{}, {}];
  const collection = {
    inert: false,
    style: { overflow: 'auto' },
    querySelectorAll: () => controls,
  };
  const scope = {
    inert: false,
    style: { overflow: 'hidden' },
    dataset: {} as Record<string, string>,
    querySelectorAll: () => slots,
    closest: () => collection,
  };
  const island = { getBoundingClientRect: () => ({ left: 450, bottom: 48, width: 300 }) };
  const finish = vi.fn();
  const start = () =>
    ejectCollectionFolders(
      scope as unknown as HTMLElement,
      island as unknown as HTMLElement,
      finish,
    );
  return { scope, collection, slots, island, controls, media, finish, start };
}
beforeEach(() => {
  vi.clearAllMocks();
  motion.callback = undefined;
  motion.timeline.to.mockReturnValue(motion.timeline);
  motion.timeline.fromTo.mockReturnValue(motion.timeline);
  motion.timeline.eventCallback.mockImplementation((_name, callback) => {
    motion.callback = callback;
    return motion.timeline;
  });
  motion.timeline.progress.mockImplementation(() => {
    motion.callback?.();
    return motion.timeline;
  });
  motion.getProperty.mockImplementation((_target, property) =>
    property === 'scaleX' ? 0.72 : property === 'x' ? -150 : -110,
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('collection folder ejection', () => {
  it('ejects the three real visible slots from the island with a stagger, retaining native landing poses', () => {
    const view = fixture();
    const stop = view.start();
    const flights = motion.timeline.fromTo.mock.calls.filter(([target]) =>
      view.slots.includes(target),
    );
    expect(flights).toHaveLength(3);
    expect(flights[0][0]).toBe(view.slots[1]);
    expect(flights.map((call) => call[3])).toEqual([0.12, 0.3, 0.48]);
    const center = flights[0];
    expect(center[1]).toMatchObject({ opacity: 0, scale: 0.12, x: -100, y: -482 });
    expect(center[2]).toMatchObject({ opacity: 1, scale: 0.72, x: -150, y: -110 });
    expect(view.finish).not.toHaveBeenCalled();
    motion.callback?.();
    expect(view.finish).toHaveBeenCalledOnce();
    stop?.();
  });
  it('opens ancestor clipping and blocks browsing only until the flight completes', () => {
    const view = fixture();
    const stop = view.start();
    expect(view.scope.style.overflow).toBe('visible');
    expect(view.collection.style.overflow).toBe('visible');
    expect(view.collection.inert).toBe(true);
    expect(view.scope.dataset.ejecting).toBe('true');
    expect(view.slots.every((slot) => slot.style.transition === 'none')).toBe(true);
    motion.callback?.();
    expect(view.scope.style.overflow).toBe('hidden');
    expect(view.collection.style.overflow).toBe('auto');
    expect(view.collection.inert).toBe(false);
    expect(view.scope.dataset.ejecting).toBeUndefined();
    expect(view.slots.every((slot) => slot.style.transition === 'transform .6s')).toBe(true);
    expect(motion.set).toHaveBeenCalledWith(expect.arrayContaining(view.slots), {
      clearProps: 'transform,opacity',
    });
    stop?.();
  });
  it('cancels without consuming the handoff and ignores late completion', () => {
    const view = fixture();
    const stop = view.start();
    stop?.();
    motion.callback?.();
    expect(view.finish).not.toHaveBeenCalled();
    expect(motion.timeline.kill).toHaveBeenCalledOnce();
    expect(view.collection.inert).toBe(false);
    expect(view.scope.style.overflow).toBe('hidden');
  });
  it('settles once when resized and removes its listener', () => {
    const view = fixture();
    const remove = vi.spyOn(window, 'removeEventListener');
    const stop = view.start();
    window.dispatchEvent(new Event('resize'));
    motion.callback?.();
    expect(view.finish).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    stop?.();
  });
  it('settles when reduced motion is enabled during a flight', () => {
    const view = fixture();
    const stop = view.start();
    view.media.matches = true;
    view.media.dispatchEvent(new Event('change'));
    expect(view.finish).toHaveBeenCalledOnce();
    expect(view.collection.inert).toBe(false);
    stop?.();
  });
  it('shows the saved end state immediately when reduced motion is already enabled', () => {
    const view = fixture(3, true);
    view.start();
    expect(view.finish).toHaveBeenCalledOnce();
    expect(motion.timeline.fromTo).not.toHaveBeenCalled();
    expect(view.scope.style.overflow).toBe('hidden');
  });
  it('uses only available dossiers and does not invent missing folders', () => {
    const view = fixture(1);
    const stop = view.start();
    expect(
      motion.timeline.fromTo.mock.calls.filter(([target]) => view.slots.includes(target)),
    ).toHaveLength(1);
    stop?.();
  });
});
