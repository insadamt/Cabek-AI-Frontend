/**
 * Sends dossier folders directly from the island into their carousel slots in one continuous flight.
 * Depends on masked viewport flights and journey ownership; native carousel poses resume only after landing.
 */
import gsap from 'gsap';
import { cancelJourneyMotion, runJourneyMotion } from './journeyMotion';
import { createFolderRelease } from './folderFlight';
import { addCollectionEntrance } from './pageJourneyMotion';

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
  const origin = island.getBoundingClientRect();
  const stageBounds = stage.getBoundingClientRect();
  const previousInert = collection.inert;
  const flights = slots.map((slot) => {
    const bounds = slot.getBoundingClientRect();
    const release = createFolderRelease(slot, stage, origin.bottom);
    const { flight } = release;
    flight.style.transformOrigin = `${bounds.left + bounds.width / 2 - stageBounds.left}px ${bounds.top + bounds.height / 2 - stageBounds.top}px`;
    const visibility = slot.style.visibility;
    slot.style.visibility = 'hidden';
    return { slot, flight, bounds, visibility, remove: release.remove };
  });
  collection.inert = true;
  scope.dataset.ejecting = 'true';
  collection.dataset.handoff = 'pending';
  return runJourneyMotion({
    preserveLaunch: true,
    build: (timeline) => {
      timeline
        .set(island, { transformOrigin: '50% 0%' }, 0)
        .to(island, { scaleX: 0.99, scaleY: 1.04, duration: 0.12 }, 0)
        .to(island, { scaleX: 1, scaleY: 1, duration: 0.28 }, 0.3);
      flights.forEach(({ slot, flight, bounds, visibility, remove }, index) => {
        const start = 0.06 + index * 0.12;
        const releaseScale = Math.min(0.24, (origin.width * 0.4) / bounds.width);
        const centeredX = origin.left + origin.width / 2 - bounds.left - bounds.width / 2;
        const mouthY = origin.bottom - bounds.top - bounds.height / 2;

        // Set the hidden pose outside the paused timeline so delayed folders cannot flash at their destinations.

        gsap.set(flight, {
          force3D: true,
          opacity: 1,
          scale: releaseScale,
          x: centeredX,
          y: mouthY - (bounds.height * releaseScale) / 2 - 4,
        });

        // Position and scale share one tween so every folder heads straight to its destination without a feed phase.

        timeline
          .to(flight, { scale: 1, x: 0, y: 0, duration: 0.78, ease: 'power2.out' }, start)
          .call(
            () => {
              slot.style.visibility = visibility;
              remove();
            },
            [],
            start + 0.78,
          );
      });
      const revealTime = 0.06 + (flights.length - 1) * 0.12 + 0.66;
      timeline.call(
        () => {
          delete collection.dataset.handoff;
        },
        [],
        revealTime,
      );
      addCollectionEntrance(timeline, collection, revealTime);
    },
    restore: () => {
      flights.forEach(({ slot, remove, visibility }) => {
        slot.style.visibility = visibility;
        remove();
      });
      collection.inert = previousInert;
      delete collection.dataset.handoff;
      delete scope.dataset.ejecting;
    },
    onComplete,
  });
}
