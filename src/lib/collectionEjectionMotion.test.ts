/** Exercises real GSAP ejection frames while native carousel transforms remain untouched; depends on frozen layer stubs and journey lifecycle. */
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const flights = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./folderFlight', () => ({ createFolderRelease: flights.create }));
import { ejectCollectionFolders } from './collectionEjectionMotion';

function fixture(count = 3, reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('window', new EventTarget());
  const slots = Array.from({ length: count }, (_, index) => ({
    classList: { contains: () => index === 1 },
    style: { visibility: '', transform: 'native perspective pose', transition: 'transform .6s' },
    getBoundingClientRect: () => ({ left: index * 400, top: 300, width: 300, height: 220 }),
  }));
  const controls = [{ opacity: 1, x: 0, y: 0, scale: 1 }];
  const actions = [{ opacity: 1, x: 0, y: 0, scale: 1 }];
  const details = [{ opacity: 1, x: 0, y: 0, scale: 1 }];
  const node = () => [{ opacity: 1, x: 0, y: 0, scale: 1 }];
  const elements: Record<string, ReturnType<typeof node>> = {
    '.category-heading h1, .category-heading .workflow-primary': controls,
    '.category-heading .back-link': node(),
    '.category-browse-controls .segmented-control': node(),
    '.category-filters': node(),
    '.home-bottom-bar .home-folder-search': node(),
    '.home-bottom-bar .home-open-dossier': actions,
    '.carousel-navigation': details,
    '.home-bottom-bar .dossier-menu-trigger': node(),
  };
  const collection = {
    inert: false,
    dataset: {} as Record<string, string>,
    querySelectorAll: (selector: string) => elements[selector] ?? [],
  };
  const stage = { getBoundingClientRect: () => ({ left: 0, top: 100 }) };
  const scope = {
    dataset: {} as Record<string, string>,
    querySelectorAll: () => slots,
    querySelector: () => stage,
    closest: () => collection,
  };
  const layers: Array<{
    style: Record<string, string>;
    scale: number;
    opacity: number;
    x: number;
    y: number;
    remove: ReturnType<typeof vi.fn>;
  }> = [];
  flights.create.mockImplementation(() => {
    const layer = { style: {}, scale: 1, opacity: 1, x: 0, y: 0, force3D: false, remove: vi.fn() };
    layers.push(layer);
    return { flight: layer, remove: layer.remove };
  });
  const island = {
    scaleX: 1,
    scaleY: 1,
    transformOrigin: '50% 50%',
    getBoundingClientRect: () => ({ left: 450, bottom: 48, width: 300 }),
  };
  const finish = vi.fn();
  const start = () =>
    ejectCollectionFolders(
      scope as unknown as HTMLElement,
      island as unknown as HTMLElement,
      finish,
    );
  return { scope, collection, slots, controls, actions, details, layers, media, finish, start };
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

describe('collection folder ejection', () => {
  it('keeps native poses intact through intermediate flight frames and reveals each destination only on landing', () => {
    const view = fixture();
    const stop = view.start();
    const timeline = activeTimeline();
    expect(view.collection.inert).toBe(true);
    expect(view.slots.every((slot) => slot.style.visibility === 'hidden')).toBe(true);
    timeline.time(0.45, false);
    expect(view.layers[0].scale).toBeGreaterThan(0.12);
    expect(view.layers[0].scale).toBeLessThan(1);
    expect(view.slots.every((slot) => slot.style.transform === 'native perspective pose')).toBe(
      true,
    );
    expect(view.slots.every((slot) => slot.style.transition === 'transform .6s')).toBe(true);
    timeline.time(0.85, false);
    expect(view.slots[1].style.visibility).toBe('');
    expect(view.slots[0].style.visibility).toBe('hidden');
    expect(view.controls[0].opacity).toBe(0);
    timeline.progress(1);
    expect(view.finish).toHaveBeenCalledOnce();
    expect(view.collection.inert).toBe(false);
    expect(view.scope.dataset.ejecting).toBeUndefined();
    expect(view.slots.every((slot) => slot.style.visibility === '')).toBe(true);
    stop?.();
  });
  it('overlaps directional controls with the final folder landing', () => {
    const view = fixture();
    view.start();
    const timeline = activeTimeline();
    timeline.time(1.0, false);
    expect(view.slots.some((slot) => slot.style.visibility === 'hidden')).toBe(true);
    expect(view.controls[0].opacity).toBeGreaterThan(0);
    expect(view.controls[0].y).toBeLessThan(0);
    expect(view.actions[0].opacity).toBe(0);
    expect(view.details[0].opacity).toBe(0);
    timeline.progress(1);
  });
  it('moves and grows each opaque folder directly from the island without a vertical feed phase', () => {
    const view = fixture();
    view.start();
    const timeline = activeTimeline();
    const sortedSlots = [view.slots[1], view.slots[0], view.slots[2]];
    view.layers.forEach((flight, index) => {
      const bounds = sortedSlots[index].getBoundingClientRect();
      expect(bounds.left + bounds.width / 2 + flight.x).toBeCloseTo(600);
      expect(
        bounds.top + bounds.height / 2 + flight.y + (bounds.height * flight.scale) / 2,
      ).toBeCloseTo(44);
    });
    sortedSlots.forEach((slot, index) => {
      const flight = view.layers[index];
      const bounds = slot.getBoundingClientRect();
      const start = 0.06 + index * 0.12;
      timeline.time(start, false);
      const releaseScale = flight.scale;
      const initialX = flight.x;
      const initialY = flight.y;
      expect(flight.opacity).toBe(1);
      expect(bounds.left + bounds.width / 2 + flight.x).toBeCloseTo(600);
      expect(
        bounds.top + bounds.height / 2 + flight.y + (bounds.height * flight.scale) / 2,
      ).toBeCloseTo(44);
      timeline.time(start + 0.18, false);
      expect(flight.scale).toBeGreaterThan(releaseScale);
      expect(flight.scale).toBeLessThan(1);
      expect(flight.opacity).toBe(1);
      expect(Math.abs(flight.x)).toBeLessThan(Math.abs(initialX));
      expect(flight.y).toBeGreaterThan(initialY);
      expect(flight.x / initialX).toBeCloseTo(flight.y / initialY, 4);
      expect(flight.x / initialX).toBeCloseTo((1 - flight.scale) / (1 - releaseScale), 4);
    });
    expect(flights.create.mock.calls.every((call) => call[2] === 48)).toBe(true);
    timeline.progress(1);
  });
  it('cancels without consuming history, removes layers, and restores interaction', () => {
    const view = fixture();
    const stop = view.start();
    stop?.();
    expect(view.finish).not.toHaveBeenCalled();
    expect(view.layers.every((layer) => layer.remove.mock.calls.length === 1)).toBe(true);
    expect(view.collection.inert).toBe(false);
    expect(view.slots.every((slot) => slot.style.visibility === '')).toBe(true);
  });
  it.each(['resize', 'reduced motion'])('settles once on %s', (event) => {
    const view = fixture();
    const stop = view.start();
    if (event === 'resize') window.dispatchEvent(new Event('resize'));
    else {
      view.media.matches = true;
      view.media.dispatchEvent(new Event('change'));
    }
    expect(view.finish).toHaveBeenCalledOnce();
    stop?.();
    expect(view.collection.inert).toBe(false);
  });
  it('settles reduced motion without leaving hidden folders', () => {
    const view = fixture(3, true);
    view.start();
    expect(view.finish).toHaveBeenCalledOnce();
    expect(view.slots.every((slot) => slot.style.visibility === '')).toBe(true);
  });
  it.each([0, 1, 2])('completes a collection with %i actual dossiers', (count) => {
    const view = fixture(count, true);
    view.start();
    expect(view.layers).toHaveLength(count);
    expect(view.finish).toHaveBeenCalledOnce();
  });
});
