/** Exercises real GSAP absorption and cancellation without browser rendering; depends on frozen-flight stubs and journey ownership. */
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const flights = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./folderFlight', () => ({ createIslandFolderFlight: flights.create }));
import { absorbCategoryFolder } from './categoryFolderMotion';

function fixture(reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('window', new EventTarget());
  const folder = {
    style: { visibility: '' },
    getBoundingClientRect: () => ({ left: 300, top: 200, width: 400, height: 300 }),
  };
  const island = {
    scale: 1,
    getBoundingClientRect: () => ({ left: 350, top: 0, bottom: 44, width: 300, height: 44 }),
  };
  const flight = { scale: 1, opacity: 1, x: 0, y: 0, remove: vi.fn() };
  flights.create.mockReturnValue({ flight, remove: flight.remove });
  const complete = vi.fn();
  const cancelled = vi.fn();
  const start = () =>
    absorbCategoryFolder(
      folder as unknown as HTMLElement,
      [],
      island as unknown as HTMLElement,
      complete,
      cancelled,
    );
  return { folder, island, flight, media, complete, cancelled, start };
}
function activeTimeline() {
  return gsap.globalTimeline
    .getChildren()
    .find((child) => child instanceof gsap.core.Timeline) as gsap.core.Timeline;
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  gsap.globalTimeline.clear();
  vi.unstubAllGlobals();
});
describe('category to island motion', () => {
  it('uses the frozen copy, keeps the source in layout, and reaches the island before disappearing', () => {
    const view = fixture();
    const cancel = view.start();
    expect(flights.create).toHaveBeenCalledWith(view.folder, view.folder, 44);
    expect(view.folder.style.visibility).toBe('hidden');
    const timeline = activeTimeline();
    timeline.time(0.8, false);
    expect(view.flight.scale).toBeGreaterThan(0.1);
    expect(view.flight.scale).toBeLessThan(0.2);
    expect(view.flight.opacity).toBe(1);
    expect(view.flight.y).toBeLessThan(-300);
    timeline.progress(1);
    expect(view.complete).toHaveBeenCalledOnce();
    expect(view.folder.style.visibility).toBe('');
    expect(view.flight.remove).toHaveBeenCalledOnce();
    cancel();
    expect(view.cancelled).not.toHaveBeenCalled();
  });
  it.each(['popstate', 'pagehide'])(
    'cancels on %s without navigating and restores the source',
    (event) => {
      const view = fixture();
      view.start();
      window.dispatchEvent(new Event(event));
      expect(view.complete).not.toHaveBeenCalled();
      expect(view.cancelled).toHaveBeenCalledOnce();
      expect(view.folder.style.visibility).toBe('');
      expect(view.flight.remove).toHaveBeenCalledOnce();
    },
  );
  it.each(['resize', 'reduced motion'])('settles once on %s', (event) => {
    const view = fixture();
    const cancel = view.start();
    if (event === 'resize') window.dispatchEvent(new Event('resize'));
    else {
      view.media.matches = true;
      view.media.dispatchEvent(new Event('change'));
    }
    expect(view.complete).toHaveBeenCalledOnce();
    cancel();
    expect(view.flight.remove).toHaveBeenCalledOnce();
  });
  it('skips travel for reduced motion and leaves no active journey', () => {
    const view = fixture(true);
    view.start();
    expect(view.complete).toHaveBeenCalledOnce();
    expect(view.folder.style.visibility).toBe('');
  });
  it('cancels a superseded journey and permits only the newest completion', () => {
    const first = fixture();
    first.start();
    const second = fixture();
    second.start();
    expect(first.cancelled).toHaveBeenCalledOnce();
    expect(first.complete).not.toHaveBeenCalled();
    activeTimeline().progress(1);
    expect(second.complete).toHaveBeenCalledOnce();
  });
});
