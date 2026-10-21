import gsap from 'gsap';

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
  getMotionElements(section).forEach((element) => {
    const previous = previousPositions.get(getMotionKey(element));
    const current = element.getBoundingClientRect();

    // Translate natural-size elements; scaling a search field into a button stretches its text.

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
