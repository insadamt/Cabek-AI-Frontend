/**
 * Reveals the workflow choices after cinematic entry without replaying them on category changes.
 * Depends on GSAP, the scene's completion state and the shared reduced-motion observer.
 */
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

export function useCategoryStageReveal(introComplete: boolean) {
  const dockRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock || !introComplete || prefersReducedMotion()) return;
    let revealTimeline: gsap.core.Timeline | undefined;
    const context = gsap.context(() => {
      const categoryButtons = dock.querySelectorAll('[data-category-reveal]');
      const collectionAction = dock.querySelector('[data-category-action]');
      revealTimeline = gsap.timeline();
      revealTimeline.fromTo(
        categoryButtons,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.56,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        },
      );
      revealTimeline.fromTo(
        collectionAction,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
        '>-0.06',
      );
    }, dock);

    // Resize and preference changes must leave a complete, reachable menu instead of partial transforms.

    const finishReveal = () => {
      revealTimeline?.progress(1).pause();
    };
    const stopObserving = observeReducedMotion(finishReveal);
    window.addEventListener('resize', finishReveal);
    return () => {
      stopObserving();
      window.removeEventListener('resize', finishReveal);
      context.revert();
    };
  }, [introComplete]);

  return dockRef;
}
