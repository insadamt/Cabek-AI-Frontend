import gsap from 'gsap';
import { animateSearchReturnContents } from './searchReturnMotion';

const controlSelector = '[data-flip-id="home-search"], [data-flip-id="home-action"]';

function getMotionElements(section: HTMLElement) {
  return Array.from(
    section.querySelectorAll<HTMLElement>(`.home-grid-folder-preview, ${controlSelector}`),
  ).filter((element) => element.getClientRects().length > 0);
}

function getMotionKey(element: HTMLElement) {
  return (
    element.dataset.flipId ?? element.closest<HTMLElement>('[data-folder-id]')!.dataset.folderId!
  );
}

export function captureGridFolderPositions(section: HTMLElement) {
  return new Map(
    getMotionElements(section).map((element) => [
      getMotionKey(element),
      element.getBoundingClientRect(),
    ]),
  );
}

export function animateGridFolderPositions(
  section: HTMLElement,
  previousPositions: ReturnType<typeof captureGridFolderPositions>,
  reducedMotion: boolean,
  onComplete: () => void,
) {
  const timeline = gsap.timeline({ onComplete });
  const elements = getMotionElements(section).map((element) => ({
    element,
    bounds: element.getBoundingClientRect(),
  }));
  elements.forEach(({ element, bounds: current }) => {
    const previous = previousPositions.get(getMotionKey(element));
    if (element.matches(controlSelector) && previous) {
      const container = element.parentElement!.getBoundingClientRect();
      const persistentSearch = element.dataset.mode !== undefined;

      // Take controls out of flex flow while their widths change so siblings cannot push each other.

      timeline.fromTo(
        element,
        {
          position: 'absolute',
          left: current.left - container.left,
          top: current.top - container.top,
          width: previous.width,
          height: previous.height,
          x: previous.left - current.left,
          y: previous.top - current.top,
          opacity: persistentSearch ? 1 : 0,
          overflow: 'hidden',
        },
        {
          width: current.width,
          height: current.height,
          x: 0,
          y: 0,
          opacity: 1,
          duration: reducedMotion ? 0 : 0.36,
          ease: 'power2.inOut',
          clearProps: 'position,left,top,width,height,transform,opacity,overflow',
        },
        0,
      );
      if (persistentSearch) animateSearchReturnContents(timeline, element, reducedMotion);
      return;
    }

    // Folder artwork keeps its natural proportions instead of stretching with the controls.

    timeline.fromTo(
      element,
      {
        x: previous ? previous.left + previous.width / 2 - current.left - current.width / 2 : 0,
        y: previous ? previous.top + previous.height / 2 - current.top - current.height / 2 : 8,
        opacity: previous ? 1 : 0,
      },
      {
        x: 0,
        y: 0,
        opacity: 1,
        duration: reducedMotion ? 0 : 0.36,
        ease: 'power2.inOut',
        clearProps: 'transform,opacity',
      },
      0,
    );
  });
  return timeline;
}
