/**
 * Hands category absorption to the three real visible carousel folders without a clipped or skipped flight.
 * Depends on the existing carousel transforms, island geometry and GSAP; completion alone consumes the history cue.
 */
import { useLayoutEffect, useRef } from 'react';
import { ejectCollectionFolders } from '../lib/collectionEjectionMotion';

export function useCollectionEjection(count: number) {
  const container = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const scope = container.current;
    if (!scope || !count || !window.history.state?.ejectFolders) return;
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    if (!island) return;
    const path = window.location.pathname + window.location.search;
    return ejectCollectionFolders(scope, island, () => {
      // Strict Mode cleanup cancels presentation; it must leave the cue available to the replacement setup.
      if (path !== window.location.pathname + window.location.search) return;
      window.history.replaceState({ ...window.history.state, ejectFolders: false }, '');
    });
  }, [count]);
  return container;
}
