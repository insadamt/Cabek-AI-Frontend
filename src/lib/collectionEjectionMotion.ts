/**
 * Ejects frozen dossier copies into untouched carousel slots, then reveals controls in order.
 * Depends on viewport perspective layers and journey ownership; native gestures and CSS transforms resume after landing.
 */
import { cancelJourneyMotion, runJourneyMotion } from './journeyMotion';
import { createFolderFlight } from './folderFlight';

export function ejectCollectionFolders(
  scope: HTMLElement,
  island: HTMLElement,
  onComplete: () => void,
) {
  cancelJourneyMotion();
  const slots = Array.from(scope.querySelectorAll<HTMLElement>('.carousel-folder-slot'))
    .sort(
      (left, right) =>
        Number(right.classList.contains('is-active')) -
        Number(left.classList.contains('is-active')),
    )
    .slice(0, 3);
  if (!slots.length) {
    onComplete();
    return;
  }
  const collection = scope.closest<HTMLElement>('.category-collection') ?? scope;
  const stage = scope.querySelector<HTMLElement>('.carousel-stage')!;
  const controls = collection.querySelectorAll<HTMLElement>('.category-controls, .carousel-edge');
  const actions = collection.querySelectorAll<HTMLElement>('.home-bottom-bar');
  const details = collection.querySelectorAll<HTMLElement>(
    '.carousel-counter, .carousel-backdrop-word',
  );
  const origin = island.getBoundingClientRect();
  const stageBounds = stage.getBoundingClientRect();
  const previousInert = collection.inert;
  const flights = slots.map((slot) => {
    const bounds = slot.getBoundingClientRect();
    const flight = createFolderFlight(slot, stage);
    flight.style.transformOrigin = `${bounds.left + bounds.width / 2 - stageBounds.left}px ${bounds.top + bounds.height / 2 - stageBounds.top}px`;
    const visibility = slot.style.visibility;
    slot.style.visibility = 'hidden';
    return { slot, flight, bounds, visibility };
  });
  collection.inert = true;
  scope.dataset.ejecting = 'true';
  collection.dataset.handoff = 'pending';
  return runJourneyMotion({
    build: (timeline) => {
      timeline
        .to(island, { scale: 1.035, duration: 0.18 }, 0)
        .to(island, { scale: 1, duration: 0.25 }, 0.45);
      flights.forEach(({ slot, flight, bounds, visibility }, index) => {
        const start = 0.1 + index * 0.14;
        timeline
          .fromTo(
            flight,
            {
              opacity: 0,
              scale: 0.12,
              x: origin.left + origin.width / 2 - bounds.left - bounds.width / 2,
              y: origin.bottom - bounds.top - bounds.height / 2,
            },
            { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.7, ease: 'power3.out' },
            start,
          )
          .call(
            () => {
              slot.style.visibility = visibility;
              flight.remove();
            },
            [],
            start + 0.7,
          );
      });
      timeline
        .call(
          () => {
            delete collection.dataset.handoff;
          },
          [],
          1.08,
        )
        .fromTo(controls, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.08)
        .fromTo(actions, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.2)
        .fromTo(details, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.3);
    },
    restore: () => {
      flights.forEach(({ slot, flight, visibility }) => {
        slot.style.visibility = visibility;
        flight.remove();
      });
      collection.inert = previousInert;
      delete collection.dataset.handoff;
      delete scope.dataset.ejecting;
    },
    onComplete,
  });
}
