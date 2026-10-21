import { describe, expect, it, vi } from 'vitest';
import { animateGridFolderPositions } from './gridFolderMotion';

const motion = vi.hoisted(() => ({ fromTo: vi.fn() }));
vi.mock('gsap', () => ({ default: { timeline: () => motion } }));

describe('natural-size folder movement', () => {
  it('moves changed-size controls by their centers without animating their size or scale', () => {
    const button = {
      dataset: { flipId: 'home-search' },
      getClientRects: () => [1],
      getBoundingClientRect: () => ({ left: 200, top: 300, width: 90, height: 50 }),
    };
    const section = { querySelectorAll: () => [button] } as unknown as HTMLElement;
    const positions = new Map([
      ['home-search', { left: 100, top: 400, width: 300, height: 50 } as DOMRect],
    ]);
    animateGridFolderPositions(section, positions, false, () => {});
    const [, from, to] = motion.fromTo.mock.calls.at(-1)!;
    expect(from).toEqual({ x: 5, y: 100, opacity: 1 });
    for (const properties of [from, to]) {
      expect(properties).not.toHaveProperty('scale');
      expect(properties).not.toHaveProperty('width');
      expect(properties).not.toHaveProperty('height');
    }
    expect(to.duration).toBe(0.36);
  });
});
