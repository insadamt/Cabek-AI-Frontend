/** Exercises error expiry, polling stability and interruption cleanup using fake timers; depends on a minimal React effect harness without browser automation. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({
  dismissed: null as string | null,
  effect: undefined as (() => void | (() => void)) | undefined,
  key: undefined as string | null | undefined,
  cleanup: undefined as (() => void) | undefined,
}));
vi.mock('react', () => ({
  useState: () => [
    hooks.dismissed,
    (value: string | null) => {
      hooks.dismissed = value;
    },
  ],
  useEffect: (effect: () => void | (() => void), dependencies: [string | null]) => {
    if (dependencies[0] !== hooks.key) {
      hooks.key = dependencies[0];
      hooks.effect = effect;
    }
  },
}));
import { useIslandErrorTimeout } from './useIslandErrorTimeout';
function render(key: string | null) {
  const dismissed = useIslandErrorTimeout(key);
  if (hooks.effect) {
    hooks.cleanup?.();
    const effect = hooks.effect;
    hooks.effect = undefined;
    hooks.cleanup = effect() || undefined;
  }
  return dismissed;
}
beforeEach(() => {
  vi.useFakeTimers();
  hooks.dismissed = null;
  hooks.effect = undefined;
  hooks.key = undefined;
  hooks.cleanup = undefined;
});
afterEach(() => {
  hooks.cleanup?.();
  vi.useRealTimers();
});

describe('five-second island errors', () => {
  it('keeps an error for five seconds, then dismisses it', () => {
    expect(render('capture:one')).toBe(false);
    vi.advanceTimersByTime(4999);
    expect(render('capture:one')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(render('capture:one')).toBe(true);
  });
  it('does not restart the notice on every polling render', () => {
    render('capture:one');
    for (let tick = 0; tick < 4; tick++) {
      vi.advanceTimersByTime(1000);
      render('capture:one');
    }
    vi.advanceTimersByTime(1000);
    expect(render('capture:one')).toBe(true);
    vi.advanceTimersByTime(15000);
    expect(render('capture:one')).toBe(true);
  });
  it('gives a new operation a fresh duration without an older timer dismissing it', () => {
    render('opening:one');
    vi.advanceTimersByTime(4000);
    expect(render('report:two')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(render('report:two')).toBe(false);
    vi.advanceTimersByTime(4000);
    expect(render('report:two')).toBe(true);
  });
  it('allows the same failure to be announced again after recovery and retry', () => {
    render('analysis:one');
    vi.advanceTimersByTime(5000);
    expect(render('analysis:one')).toBe(true);
    expect(render(null)).toBe(false);
    expect(render('analysis:one')).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(render('analysis:one')).toBe(true);
  });
  it('cleans pending expiry when navigation unmounts the island', () => {
    render('capture:one');
    hooks.cleanup?.();
    hooks.cleanup = undefined;
    vi.advanceTimersByTime(5000);
    expect(hooks.dismissed).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('survives Strict Mode effect cleanup and setup without duplicate timers', () => {
    useIslandErrorTimeout('opening:one');
    const effect = hooks.effect!;
    const cleanup = effect();
    if (cleanup) cleanup();
    const finalCleanup = effect();
    hooks.cleanup = finalCleanup || undefined;
    hooks.effect = undefined;
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(render('opening:one')).toBe(true);
  });
});
