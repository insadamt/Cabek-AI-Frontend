import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocumentTimeline } from './useFolderDocumentMotion';

function createPaperFixture() {
  const folder = {
    offsetHeight: 220,
    closest: () => null,
    getBoundingClientRect: () => ({ top: 270 }),
  };
  return {
    parentElement: folder,
    offsetTop: 15,
    offsetHeight: 280,
    offsetWidth: 270,
    scale: 1,
    zIndex: 2,
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
    paper.scale *
      (paper.offsetHeight * Math.cos(rotation) + (paper.offsetWidth / 2) * Math.sin(rotation));
  expect(bottom).toBeLessThanOrEqual(paper.parentElement.offsetHeight * 0.94 + 0.01);
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
    createDocumentTimeline(paper as unknown as HTMLElement)
      .progress(0)
      .pause();
    expectPaperInsidePocket(paper);
  });
});
