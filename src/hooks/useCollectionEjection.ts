/** Ejects real fetched folders once after category absorption; depends on the existing carousel, island and GSAP ownership. */
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

export function useCollectionEjection(count: number) {
  const container = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const scope = container.current;
    if (!scope || !count || !window.history.state?.ejectFolders) return;
    window.history.replaceState({ ...window.history.state, ejectFolders: false }, '');
    if (prefersReducedMotion()) return;
    const island = document.querySelector('.ai-activity-island');
    if (!island) return;
    const origin = island.getBoundingClientRect();
    const folders = Array.from(scope.querySelectorAll<HTMLElement>('.dossier-folder'));
    const previouslyInert = scope.inert;
    scope.inert = true;
    const timeline = gsap.timeline({
      onComplete: () => {
        scope.inert = previouslyInert;
      },
    });
    folders.forEach((folder, index) => {
      const destination = folder.getBoundingClientRect();
      timeline.fromTo(
        folder,
        {
          opacity: 0,
          scale: 0.14,
          x: origin.left + origin.width / 2 - destination.left - destination.width / 2,
          y: origin.bottom - destination.top - destination.height / 2,
        },
        {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.65,
          ease: 'back.out(1.1)',
          clearProps: 'transform,opacity',
        },
        Math.min(index, 4) * 0.08,
      );
    });
    const settle = () => timeline.progress(1);
    const stop = observeReducedMotion(settle);
    window.addEventListener('resize', settle);
    return () => {
      stop();
      window.removeEventListener('resize', settle);
      timeline.kill();
      gsap.set(folders, { clearProps: 'transform,opacity' });
      scope.inert = previouslyInert;
    };
  }, [count]);
  return container;
}
