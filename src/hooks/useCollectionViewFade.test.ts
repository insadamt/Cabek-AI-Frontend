/** Exercises real opacity frames, interrupted reversals and readiness without browser automation; depends on GSAP and native-view stubs. */
import gsap from 'gsap';
import { afterEach, describe, expect, it } from 'vitest';
import { createCollectionFade } from './useCollectionViewFade';

function fixture() {
  const carouselArtwork = { opacity: 1, transform: 'native carousel pose' };
  const gridArtwork = { opacity: 0, transform: 'native grid layout' };
  const carousel = {
    hidden: false,
    dataset: { fadeInitialized: 'true' },
    querySelectorAll: () => [carouselArtwork],
  };
  const grid = {
    hidden: true,
    dataset: { fadeInitialized: 'true' },
    querySelectorAll: () => [gridArtwork],
  };
  const fade = (gridRequested: boolean, gridReady = true, immediate = false) =>
    createCollectionFade({
      carousel: carousel as unknown as HTMLElement,
      grid: grid as unknown as HTMLElement,
      gridRequested,
      gridReady,
      immediate,
    });
  return { carouselArtwork, gridArtwork, carousel, grid, fade };
}

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
});

describe('collection opacity ownership', () => {
  it('crossfades both folder surfaces together without moving or scaling artwork', () => {
    const view = fixture();
    const timeline = view.fade(true);
    expect(view.grid.hidden).toBe(false);
    timeline.time(0.12, false);
    expect(view.carouselArtwork.opacity).toBeCloseTo(0.5);
    expect(view.gridArtwork.opacity).toBeCloseTo(0.5);
    expect(view.carouselArtwork.transform).toBe('native carousel pose');
    expect(view.gridArtwork.transform).toBe('native grid layout');
    timeline.progress(1);
    expect(view.carousel.hidden).toBe(true);
    expect(view.gridArtwork.opacity).toBe(1);
  });

  it('reverses from current opacity instead of restarting or finishing the previous fade', () => {
    const view = fixture();
    const opening = view.fade(true);
    opening.time(0.1, false);
    const interruptedOpacity = view.gridArtwork.opacity;
    opening.kill();
    const closing = view.fade(false);
    expect(view.gridArtwork.opacity).toBe(interruptedOpacity);
    closing.time(0.1, false);
    expect(view.gridArtwork.opacity).toBeLessThan(interruptedOpacity);
    expect(view.gridArtwork.opacity).toBeGreaterThan(0);
    closing.progress(1);
    expect(view.carouselArtwork.opacity).toBe(1);
    expect(view.grid.hidden).toBe(true);
  });

  it('holds the carousel until grid data or an error is ready while exposing the requested controls', () => {
    const view = fixture();
    view.fade(true, false).progress(1);
    expect(view.carouselArtwork.opacity).toBe(1);
    expect(view.gridArtwork.opacity).toBe(0);
    expect(view.carousel.hidden).toBe(false);
    expect(view.grid.hidden).toBe(false);
    view.fade(true, true).progress(1);
    expect(view.carousel.hidden).toBe(true);
    expect(view.gridArtwork.opacity).toBe(1);
  });

  it('settles an immediate or reduced-motion switch with no intermediate transparency', () => {
    const view = fixture();
    const timeline = view.fade(true, true, true);
    timeline.progress(1);
    expect(timeline.duration()).toBe(0);
    expect(view.carouselArtwork.opacity).toBe(0);
    expect(view.gridArtwork.opacity).toBe(1);
    expect(view.carousel.hidden).toBe(true);
  });
});
