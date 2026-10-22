import gsap from 'gsap';
import { animateSearchReturnContents } from './searchReturnMotion';

const controlSelector = '[data-flip-id="home-search"], [data-flip-id="home-action"]';

function getMotionElements(section: HTMLElement) {
  return Array.from(
    section.querySelectorAll<HTMLElement>(
      `.home-grid-folder-preview > .dossier-folder, ${controlSelector}`,
    ),
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
  const travelDuration = reducedMotion ? 0 : 0.42;
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

    if (!previous) {
      // Keep restored cards invisible until the selected folder reaches its grid cell.

      timeline.fromTo(
        element.closest<HTMLElement>('.home-grid-folder') ?? element,
        { opacity: 0 },
        {
          opacity: 1,
          duration: reducedMotion ? 0 : 0.18,
          ease: 'power2.out',
          clearProps: 'opacity',
        },
        travelDuration,
      );
      return;
    }

    // Keep the preview's layout space while the real folder travels above the scroll clip.

    const metadata = element
      .closest<HTMLElement>('.home-grid-folder')
      ?.querySelectorAll<HTMLElement>(':scope > .home-result-title, :scope > .status-badge');
    if (metadata?.length)
      timeline.fromTo(
        metadata,
        { opacity: 0 },
        { opacity: 1, duration: reducedMotion ? 0 : 0.18, clearProps: 'opacity' },
        travelDuration,
      );

    // One scale preserves the artwork's aspect ratio and removes the instant thumbnail size jump.

    timeline.fromTo(
      element,
      {
        position: 'fixed',
        left: current.left,
        top: current.top,
        width: current.width,
        height: current.height,
        zIndex: 5,
        transformOrigin: '50% 50%',
        x: previous.left + previous.width / 2 - current.left - current.width / 2,
        y: previous.top + previous.height / 2 - current.top - current.height / 2,
        scale: current.width > 0 ? previous.width / current.width : 1,
      },
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: travelDuration,
        ease: 'power3.inOut',
        clearProps: 'position,left,top,width,height,zIndex,transformOrigin,transform',
      },
      0,
    );
  });
  return timeline;
}
