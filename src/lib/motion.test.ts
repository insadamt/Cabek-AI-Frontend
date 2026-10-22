import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateElement } from './motion';

afterEach(() => vi.unstubAllGlobals());

describe('motion preference changes', () => {
  it('keeps the final UI immediately visible when reduced motion is already enabled', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const animate = vi.fn();
    expect(
      animateElement({ animate } as unknown as Element, [{ opacity: 0 }, { opacity: 1 }]),
    ).toBeUndefined();
    expect(animate).not.toHaveBeenCalled();
  });

  it('finishes active motion and releases its preference listener', async () => {
    const preference = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => preference);
    const removeListener = vi.spyOn(preference, 'removeEventListener');
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const animation = { finished, finish: vi.fn(() => finish()) };
    const element = { animate: vi.fn(() => animation) };
    animateElement(element as unknown as Element, [{ opacity: 0 }, { opacity: 1 }]);
    preference.matches = true;
    preference.dispatchEvent(new Event('change'));
    await finished;
    expect(animation.finish).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('releases listeners after cancellation without an unhandled rejection', async () => {
    const preference = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => preference);
    const removeListener = vi.spyOn(preference, 'removeEventListener');
    let cancel!: (error: Error) => void;
    const finished = new Promise<void>((_, reject) => {
      cancel = reject;
    });
    const element = { animate: () => ({ finished }) };
    animateElement(element as unknown as Element, [{ opacity: 0 }, { opacity: 1 }]);
    cancel(new Error('Animation cancelled'));
    await Promise.resolve();
    expect(removeListener).toHaveBeenCalledOnce();
  });
});
