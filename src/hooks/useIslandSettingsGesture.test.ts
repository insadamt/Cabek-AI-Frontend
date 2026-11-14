/** Verify five-click activation, fallback navigation and cleanup with fake timers.
 * Depends on a minimal React hook harness; no browser automation is used. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({
  ref: undefined as { current: unknown } | undefined,
  cleanup: undefined as (() => void) | undefined,
}));
vi.mock('react', () => ({
  useRef: (value: unknown) => (hooks.ref ??= { current: value }),
  useEffect: (effect: () => () => void) => {
    hooks.cleanup = effect();
  },
}));
import { islandClickGapMs, useIslandSettingsGesture } from './useIslandSettingsGesture';

beforeEach(() => {
  vi.useFakeTimers();
  hooks.ref = undefined;
  hooks.cleanup = undefined;
});
afterEach(() => {
  hooks.cleanup?.();
  vi.useRealTimers();
});

describe('island settings gesture', () => {
  it('opens settings exactly on the fifth click without returning home', () => {
    const open = vi.fn(),
      home = vi.fn();
    const click = useIslandSettingsGesture(open);
    for (let count = 0; count < 4; count++) {
      click(home);
      vi.advanceTimersByTime(100);
    }
    expect(open).not.toHaveBeenCalled();
    click(home);
    expect(open).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(home).not.toHaveBeenCalled();
  });
  it('preserves single-click navigation after the click window ends', () => {
    const open = vi.fn(),
      home = vi.fn();
    const click = useIslandSettingsGesture(open);
    click(home);
    vi.advanceTimersByTime(islandClickGapMs - 1);
    expect(home).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(home).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });
  it('resets slow sequences and retains the count across renders', () => {
    const open = vi.fn();
    let click = useIslandSettingsGesture(open);
    click();
    click();
    vi.advanceTimersByTime(islandClickGapMs);
    click = useIslandSettingsGesture(open);
    click();
    click();
    click();
    expect(open).not.toHaveBeenCalled();
    click();
    click();
    expect(open).toHaveBeenCalledOnce();
  });
  it('cleans up delayed navigation when the island unmounts', () => {
    const home = vi.fn(),
      open = vi.fn();
    useIslandSettingsGesture(open)(home);
    hooks.cleanup?.();
    vi.runAllTimers();
    expect(home).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
