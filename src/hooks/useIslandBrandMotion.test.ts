import gsap from 'gsap';
import { afterEach, describe, expect, it } from 'vitest';
import { createIslandBrandTimeline } from './useIslandBrandMotion';

function fixture() {
  const mark = { y: 0, rotation: 0, scale: 1, opacity: 1 };
  const word = { x: 0, y: 0, opacity: 1 };
  const timeline = createIslandBrandTimeline(
    mark as unknown as HTMLElement,
    word as unknown as HTMLElement,
  );
  return { mark, word, timeline };
}

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
});

describe('island logo work and idle motion', () => {
  it('slides logo and wordmark upward together without fading, shrinking or rotating', () => {
    const { mark, word, timeline } = fixture();
    timeline.progress(1);
    expect(mark.y).toBe(-44);
    expect(word.y).toBe(mark.y);
    expect(mark).toMatchObject({ rotation: 0, scale: 1, opacity: 1 });
    expect(word).toMatchObject({ x: 0, opacity: 1 });
  });
  it('restores native logo proportions and wordmark position on idle', () => {
    const { mark, word, timeline } = fixture();
    timeline.progress(1).progress(0);
    expect(mark).toMatchObject({ y: 0, rotation: 0, scale: 1, opacity: 1 });
    expect(word).toMatchObject({ x: 0, y: 0, opacity: 1 });
  });
  it('reverses an interrupted exit from its current position', () => {
    const { mark, timeline } = fixture();
    timeline.progress(0.6);
    const workingPosition = mark.y;
    timeline.reverse().pause();
    expect(mark.y).toBe(workingPosition);
    timeline.progress(0.3);
    expect(mark.y).toBeGreaterThan(workingPosition);
    timeline.progress(0);
    expect(mark.y).toBe(0);
  });
});
