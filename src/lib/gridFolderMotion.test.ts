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

  it.each([
    [280, 420, false],
    [420, 280, false],
    [280, 420, true],
  ])(
    'preserves the source rectangle while moving a %ipx folder to %ipx (reduced: %s)',
    (oldWidth, width, reduced) => {
      const folder = {
        ...createControl(width),
        matches: () => false,
        closest: () => null,
        getBoundingClientRect: () => ({ left: 200, top: 300, width, height: width / 1.36 }),
      };
      const section = { querySelectorAll: () => [folder] } as unknown as HTMLElement;
      const positions = new Map([
        [
          'home-search',
          { left: 100, top: 400, width: oldWidth, height: oldWidth / 1.36 } as DOMRect,
        ],
      ]);
      animateGridFolderPositions(section, positions, reduced, () => {});
      const [, from, to] = motion.fromTo.mock.calls.at(-1)!;
      expect(from.position).toBe('fixed');
      expect(from.transformOrigin).toBe('50% 50%');
      expect(from.scale).toBe(oldWidth / width);
      expect(from.left + from.x + (width * (1 - from.scale)) / 2).toBeCloseTo(100);
      expect(from.top + from.y + ((width / 1.36) * (1 - from.scale)) / 2).toBeCloseTo(400);
      expect(to).toMatchObject({ x: 0, y: 0, scale: 1, duration: reduced ? 0 : 0.42 });
      expect(to.clearProps).toBe('position,left,top,width,height,zIndex,transformOrigin,transform');
      expect(from).not.toHaveProperty('scaleX');
      expect(from).not.toHaveProperty('scaleY');
    },
  );

  it.each([false, true])('fades neighboring cards only after arrival (reduced: %s)', (reduced) => {
    const article = {};
    const folder = {
      ...createControl(280),
      matches: () => false,
      closest: () => article,
    };
    const section = { querySelectorAll: () => [folder] } as unknown as HTMLElement;
    animateGridFolderPositions(section, new Map(), reduced, () => {});
    const [target, from, to, start] = motion.fromTo.mock.calls.at(-1)!;
    expect(target).toBe(article);
    expect(from.opacity).toBe(0);
    expect(to.opacity).toBe(1);
    expect(from).not.toHaveProperty('y');
    expect(start).toBe(reduced ? 0 : 0.42);
  });

  it('keeps the returning folder title and status hidden until its travel finishes', () => {
    const metadata = [{}, {}];
    const folder = {
      ...createControl(280),
      matches: () => false,
      closest: () => ({ querySelectorAll: () => metadata }),
    };
    const section = { querySelectorAll: () => [folder] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 100, width: 420, height: 309 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, false, () => {});
    const [, , travel] = motion.fromTo.mock.calls.filter(([target]) => target === folder).at(-1)!;
    const [, from, to, start] = motion.fromTo.mock.calls
      .filter(([target]) => target === metadata)
      .at(-1)!;
    expect(from.opacity).toBe(0);
    expect(to.opacity).toBe(1);
    expect(start).toBe(travel.duration);
  });
});
