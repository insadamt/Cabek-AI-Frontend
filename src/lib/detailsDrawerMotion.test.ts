import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDetailsDrawer } from './detailsDrawerMotion';

type TweenOptions = {
  onComplete?: () => void;
  xPercent?: number;
  yPercent?: number;
  y?: number;
  opacity?: number;
  duration?: number;
};
const motion = vi.hoisted(() => ({
  tweens: [] as {
    options: TweenOptions;
    kill: ReturnType<typeof vi.fn>;
    progress: ReturnType<typeof vi.fn>;
  }[],
  origins: [] as TweenOptions[],
}));

vi.mock('gsap', () => {
  function createTween(options: TweenOptions) {
    const tween = { options, kill: vi.fn(), progress: vi.fn(() => options.onComplete?.()) };
    motion.tweens.push(tween);
    return tween;
  }
  return {
    default: {
      fromTo: (_element: unknown, origin: TweenOptions, destination: TweenOptions) => {
        motion.origins.push(origin);
        return createTween(destination);
      },
      to: (_element: unknown, options: TweenOptions) => createTween(options),
    },
  };
});

function setup({ reduced = false, mobile = false } = {}) {
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const browserWindow = new EventTarget();
  const previousFocus = { isConnected: true, focus: vi.fn() };
  const body = { style: { overflow: 'auto' } };
  vi.stubGlobal('document', { activeElement: previousFocus, body });
  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('matchMedia', (query: string) =>
    query.includes('prefers-reduced-motion') ? preference : { matches: mobile },
  );
  const dialog = {
    showModal: vi.fn(),
    close: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn() },
  };
  const onClosed = vi.fn();
  const lifecycle = openDetailsDrawer(dialog as unknown as HTMLDialogElement, onClosed);
  return { preference, browserWindow, previousFocus, body, dialog, onClosed, lifecycle };
}

beforeEach(() => {
  motion.tweens = [];
  motion.origins = [];
});
afterEach(() => vi.unstubAllGlobals());

describe('details drawer motion and focus lifecycle', () => {
  it.each([false, true])(
    'opens a native modal with the correct travel direction (mobile: %s)',
    (mobile) => {
      const { dialog, body, lifecycle } = setup({ mobile });
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(body.style.overflow).toBe('hidden');
      expect(motion.origins[0]).toMatchObject({
        xPercent: mobile ? 0 : 100,
        yPercent: 0,
        y: mobile ? 24 : 0,
      });
      expect(motion.tweens[0].options.duration).toBeLessThanOrEqual(0.2);
      lifecycle.requestClose();
      expect(motion.tweens[1].options.duration).toBeLessThanOrEqual(0.16);
      expect(motion.tweens[1].options.y).toBe(mobile ? 18 : 0);
      lifecycle.dispose();
      expect(body.style.overflow).toBe('auto');
    },
  );

  it('defers dismissal and evidence navigation until the exit and native-modal cleanup finish', () => {
    const { lifecycle, onClosed, dialog, previousFocus } = setup();
    const showEvidence = vi.fn(() => expect(dialog.close).toHaveBeenCalledOnce());
    lifecycle.requestClose(showEvidence);
    expect(motion.tweens[0].kill).toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();
    expect(showEvidence).not.toHaveBeenCalled();
    motion.tweens[1].options.onComplete?.();
    expect(onClosed).toHaveBeenCalledOnce();
    expect(showEvidence).not.toHaveBeenCalled();
    lifecycle.dispose();
    expect(showEvidence).toHaveBeenCalledOnce();
    expect(previousFocus.focus).not.toHaveBeenCalled();
  });

  it('ignores repeated dismissal and restores focus without scrolling the card list', () => {
    const { lifecycle, onClosed, previousFocus } = setup();
    lifecycle.requestClose();
    lifecycle.requestClose();
    expect(motion.tweens).toHaveLength(2);
    motion.tweens[1].options.onComplete?.();
    motion.tweens[1].options.onComplete?.();
    expect(onClosed).toHaveBeenCalledOnce();
    lifecycle.dispose();
    lifecycle.dispose();
    expect(previousFocus.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it('dismisses immediately with reduced motion and does not create a tween', () => {
    const { lifecycle, onClosed } = setup({ reduced: true });
    lifecycle.requestClose();
    expect(onClosed).toHaveBeenCalledOnce();
    expect(motion.tweens).toHaveLength(0);
    lifecycle.dispose();
  });

  it('settles an active exit when reduced motion changes and removes its listeners', () => {
    const { lifecycle, preference, onClosed } = setup();
    const removeListener = vi.spyOn(preference, 'removeEventListener');
    lifecycle.requestClose();
    preference.matches = true;
    preference.dispatchEvent(new Event('change'));
    expect(onClosed).toHaveBeenCalledOnce();
    lifecycle.dispose();
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('settles travel when the viewport changes and cancels pending navigation on external unmount', () => {
    const { lifecycle, browserWindow, onClosed } = setup();
    browserWindow.dispatchEvent(new Event('resize'));
    expect(motion.tweens[0].progress).toHaveBeenCalledWith(1);
    const showEvidence = vi.fn();
    lifecycle.requestClose(showEvidence);
    lifecycle.dispose();
    motion.tweens[1].options.onComplete?.();
    browserWindow.dispatchEvent(new Event('resize'));
    expect(onClosed).not.toHaveBeenCalled();
    expect(showEvidence).not.toHaveBeenCalled();
    expect(motion.tweens[1].progress).not.toHaveBeenCalled();
  });
});
