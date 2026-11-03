/** Keeps category ejection in charge of route motion so viewport translation cannot break island continuity. */
import { afterEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({
  effect: undefined as (() => void) | undefined,
  animate: vi.fn(),
}));
vi.mock('react', () => ({
  useRef: (initial: unknown) => ({
    current: typeof initial === 'string' ? '/' : { querySelector: () => ({}) },
  }),
  useLayoutEffect: (effect: () => void) => {
    hooks.effect = effect;
  },
}));
vi.mock('../lib/motion', () => ({ animateElement: hooks.animate, motionTiming: { layout: 320 } }));
import { useRouteMotion } from './useRouteMotion';
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe('category transition route animation', () => {
  it('skips generic page movement while the island owns the folder handoff', () => {
    vi.stubGlobal('window', { history: { state: { ejectFolders: true } } });
    useRouteMotion('/categories/forfait-expertise');
    hooks.effect?.();
    expect(hooks.animate).not.toHaveBeenCalled();
  });
  it('retains normal page entrances for ordinary collection navigation', () => {
    vi.stubGlobal('window', { history: { state: null } });
    useRouteMotion('/categories/forfait-expertise');
    hooks.effect?.();
    expect(hooks.animate).toHaveBeenCalledOnce();
  });
});
