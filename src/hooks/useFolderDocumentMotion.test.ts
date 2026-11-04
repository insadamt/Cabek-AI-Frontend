/** Verifies measured pocket placement and reversible GSAP extraction without browser automation. */
import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocumentTimeline } from './useFolderDocumentMotion';

function createPaperFixture() {
  const folder = {
    offsetHeight: 220,
    offsetWidth: 340,
    closest: () => null,
    getBoundingClientRect: () => ({ top: 270 }),
  };
  return {
    parentElement: folder,
    offsetTop: 15,
    offsetLeft: 18,
    offsetHeight: 280,
    offsetWidth: 270,
    scale: 1,
    zIndex: 2,
    x: 0,
    y: 0,
    yPercent: 0,
    rotation: -3,
    force3D: false,
  };
}

function expectPaperInsidePocket(paper: ReturnType<typeof createPaperFixture>) {
  const rotation = (Math.abs(paper.rotation) * Math.PI) / 180;
  const bottom =
    paper.offsetTop +
    paper.y +
    paper.scale *
      (paper.offsetHeight * Math.cos(rotation) + (paper.offsetWidth / 2) * Math.sin(rotation));
  expect(bottom).toBeLessThanOrEqual(paper.parentElement.offsetHeight * 0.94 + 0.01);
  const centerY =
    paper.offsetTop + paper.y + (paper.scale * paper.offsetHeight * Math.cos(rotation)) / 2;
  const centerX =
    paper.offsetLeft +
    paper.offsetWidth / 2 +
    paper.x +
    (paper.scale * paper.offsetHeight * Math.sin(rotation)) / 2;
  expect(centerY).toBeCloseTo(paper.parentElement.offsetHeight / 2, 3);
  expect(centerX).toBeCloseTo(paper.parentElement.offsetWidth / 2, 3);
}

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
});

describe('folder document pocket state', () => {
  it('fits before the paused timeline has ever played', () => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
    const paper = createPaperFixture();
    const timeline = createDocumentTimeline(paper as unknown as HTMLElement);
    timeline.progress(0).pause().reverse();
    expectPaperInsidePocket(paper);
  });

  it('returns inside the pocket after opening at full size', () => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
    const paper = createPaperFixture();
    const timeline = createDocumentTimeline(paper as unknown as HTMLElement);
    timeline.progress(1);
    expect(paper.scale).toBe(1);
    expect(paper.zIndex).toBe(6);
    expect(paper.offsetLeft + paper.offsetWidth / 2 + paper.x).toBeCloseTo(
      paper.parentElement.offsetWidth / 2,
      3,
    );
    timeline.progress(0);
    expect(paper.zIndex).toBe(2);
    expectPaperInsidePocket(paper);
  });

  it('refits the closed sheet when the folder becomes smaller', () => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
    const paper = createPaperFixture();
    createDocumentTimeline(paper as unknown as HTMLElement)
      .progress(1)
      .kill();
    paper.parentElement.offsetHeight = 160;
    paper.parentElement.offsetWidth = 280;
    paper.offsetLeft = 12;
    createDocumentTimeline(paper as unknown as HTMLElement)
      .progress(0)
      .pause();
    expectPaperInsidePocket(paper);
  });
});
