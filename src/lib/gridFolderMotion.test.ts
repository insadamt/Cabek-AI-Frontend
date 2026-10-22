import { describe, expect, it, vi } from 'vitest';
import { animateGridFolderPositions } from './gridFolderMotion';

const motion = vi.hoisted(() => ({ fromTo: vi.fn() }));
vi.mock('gsap', () => ({ default: { timeline: () => motion } }));

function createControl(width: number) {
  return {
    dataset: { flipId: 'home-search' },
    matches: () => true,
    parentElement: {
      getBoundingClientRect: () => ({ left: 80, top: 300 }),
    },
    getClientRects: () => [1],
    getBoundingClientRect: () => ({ left: 200, top: 300, width, height: 50 }),
  };
}

describe('search control transitions', () => {
  it('keeps the persistent search surface opaque while its width collapses', () => {
    const control = {
      ...createControl(112),
      dataset: { flipId: 'home-search', mode: 'return' },
      querySelectorAll: () => [],
      querySelector: () => null,
    };
    const section = { querySelectorAll: () => [control] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 300, width: 300, height: 50 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, false, () => {});
    const [, from, to] = motion.fromTo.mock.calls.filter(([target]) => target === control).at(-1)!;
    expect(from.opacity).toBe(1);
    expect(to.opacity).toBe(1);
    expect(from.width).toBe(300);
    expect(to.width).toBe(112);
  });
  it.each([
    [300, 90, false],
    [90, 300, false],
    [300, 90, true],
  ])('transitions width from %i to %i with reduced motion %s', (oldWidth, width, reduced) => {
    const button = createControl(width);
    const section = { querySelectorAll: () => [button] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 400, width: oldWidth, height: 50 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, reduced, () => {});
    const [, from, to] = motion.fromTo.mock.calls.at(-1)!;
    expect(from).toMatchObject({
      position: 'absolute',
      left: 120,
      top: 0,
      width: oldWidth,
      x: -100,
      y: 100,
      opacity: 0,
    });
    expect(to).toMatchObject({ width, x: 0, y: 0, opacity: 1 });
    expect(from).not.toHaveProperty('scale');
    expect(to).not.toHaveProperty('scale');
    expect(to.clearProps).toBe('position,left,top,width,height,transform,opacity,overflow');
    expect(to.duration).toBe(reduced ? 0 : 0.36);
  });

  it('measures every control before any tween changes flex layout', () => {
    const first = createControl(90);
    const second = { ...createControl(120), dataset: { flipId: 'home-action' } };
    const measureSecond = vi.spyOn(second, 'getBoundingClientRect');
    motion.fromTo.mockImplementationOnce(() => {
      expect(measureSecond).toHaveBeenCalledOnce();
    });
    const section = { querySelectorAll: () => [first, second] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 300, width: 300, height: 50 } as DOMRect],
      ['home-action', { left: 412, top: 300, width: 100, height: 50 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, false, () => {});
  });

  it('keeps folder movement at its natural size', () => {
    const folder = { ...createControl(400), matches: () => false };
    const section = { querySelectorAll: () => [folder] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 400, width: 300, height: 50 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, false, () => {});
    const [, from, to] = motion.fromTo.mock.calls.at(-1)!;
    expect(from).toEqual({ x: -150, y: 100, opacity: 1 });
    for (const properties of [from, to]) {
      expect(properties).not.toHaveProperty('scale');
      expect(properties).not.toHaveProperty('width');
      expect(properties).not.toHaveProperty('height');
    }
  });
});
