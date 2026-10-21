import { renderToStaticMarkup } from 'react-dom/server';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDossierCarousel } from './useDossierCarousel';

const tween = vi.hoisted(() => ({
  kill: vi.fn(),
  isActive: () => true,
  motion: { progress: 0 },
}));

vi.mock('gsap', () => ({
  default: {
    to: (motion: { progress: number }) => {
      tween.motion = motion;
      return tween;
    },
  },
}));

function createGestureSession() {
  const onStep = vi.fn();
  const onMotionTap = vi.fn();
  let carousel!: ReturnType<typeof useDossierCarousel>;

  // Server rendering provides real React refs without a browser or synthetic hook implementation.

  function Harness() {
    carousel = useDossierCarousel(onStep, true, onMotionTap);
    return null;
  }
  renderToStaticMarkup(<Harness />);
  const stage = {
    getBoundingClientRect: () => ({ width: 1000 }),
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => false,
  };
  function pointer(clientX: number, timeStamp = 10) {
    return {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX,
      clientY: 200,
      timeStamp,
      currentTarget: stage,
    } as unknown as PointerEvent<HTMLElement>;
  }
  return { carousel, onStep, onMotionTap, pointer };
}

describe('folder taps that interrupt swipe settling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '0.34' }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('commits the nearest folder and opens its sheet instead of returning to the start', () => {
    const { carousel, onStep, onMotionTap, pointer } = createGestureSession();
    carousel.animateStep(2);
    tween.motion.progress = 1.8;
    carousel.gestureHandlers.onPointerDown(pointer(500));
    carousel.gestureHandlers.onPointerUp(pointer(500, 30));
    expect(onStep).toHaveBeenCalledWith(2);
    expect(onMotionTap).toHaveBeenCalledWith(2, expect.anything());
    expect(carousel.canSelect()).toBe(false);
  });

  it('treats small finger jitter as a tap rather than a new swipe', () => {
    const { carousel, onStep, onMotionTap, pointer } = createGestureSession();
    carousel.animateStep(-2);
    tween.motion.progress = -1.7;
    carousel.gestureHandlers.onPointerDown(pointer(500));
    carousel.gestureHandlers.onPointerMove(pointer(498, 20));
    carousel.gestureHandlers.onPointerUp(pointer(498, 30));
    expect(onStep).toHaveBeenCalledWith(-2);
    expect(onMotionTap).toHaveBeenCalledWith(-2, expect.anything());
  });

  it('leaves a normal settled folder click available', () => {
    const { carousel, onStep, onMotionTap, pointer } = createGestureSession();
    carousel.gestureHandlers.onPointerDown(pointer(500));
    carousel.gestureHandlers.onPointerUp(pointer(500, 30));
    expect(onStep).not.toHaveBeenCalled();
    expect(onMotionTap).not.toHaveBeenCalled();
    expect(carousel.canSelect()).toBe(true);
  });

  it('allows a second swipe to interrupt motion without opening a sheet', () => {
    const { carousel, onMotionTap, pointer } = createGestureSession();
    carousel.animateStep(2);
    tween.motion.progress = 1.8;
    carousel.gestureHandlers.onPointerDown(pointer(500));
    carousel.gestureHandlers.onPointerMove(pointer(430, 20));
    carousel.gestureHandlers.onPointerUp(pointer(430, 30));
    expect(onMotionTap).not.toHaveBeenCalled();
  });
});
