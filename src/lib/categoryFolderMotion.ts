/** Uniform absorption feeds the selected glass pocket behind the island's lower edge; depends on journey ownership and masked folder flights. */
import { cancelJourneyMotion, runJourneyMotion } from './journeyMotion';
import { createIslandFolderFlight } from './folderFlight';
import { addPageExit } from './pageJourneyMotion';

export function absorbCategoryFolder(
  folder: HTMLElement,
  peers: HTMLElement[],
  island: HTMLElement,
  onComplete: () => void,
  onCancel?: () => void,
  scope?: HTMLElement,
) {
  cancelJourneyMotion();
  const origin = folder.getBoundingClientRect();
  const target = island.getBoundingClientRect();
  const presentation = createIslandFolderFlight(folder, folder, target.bottom);
  const { flight } = presentation;
  const visibility = folder.style.visibility;
  folder.style.visibility = 'hidden';
  return runJourneyMotion({
    deferRestore: true,
    build: (timeline) => {
      if (scope) addPageExit(timeline, scope);
      if (peers.length) timeline.to(peers, { opacity: 0, scale: 0.94, y: 16, duration: 0.28 }, 0);
      timeline
        .to(flight, { y: -12, duration: 0.16, ease: 'power2.out' }, 0)
        .to(
          flight,
          {
            scale: 0.16,
            x: target.left + target.width / 2 - origin.left - origin.width / 2,
            y: target.top + target.height / 2 - origin.top - origin.height / 2,
            duration: 0.7,
            ease: 'power3.inOut',
          },
          0.16,
        )
        .to(island, { scale: 1.025, duration: 0.16 }, 0.7)
        .to(flight, { opacity: 0, scale: 0.08, duration: 0.12 }, 0.82)
        .to(island, { scale: 1, duration: 0.2 }, 0.86);
    },
    restore: () => {
      presentation.remove();
      folder.style.visibility = visibility;
    },
    onComplete,
    onCancel,
  });
}
