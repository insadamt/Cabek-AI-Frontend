import gsap from 'gsap';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

export function createIslandBrandTimeline(mark: HTMLElement, word: HTMLElement) {
  // Move the whole branding row beyond the island clip without changing its proportions.

  return gsap
    .timeline({ paused: true })
    .fromTo([mark, word], { y: 0 }, { y: -44, duration: 0.24, ease: 'power2.inOut' });
}

export function useIslandBrandMotion(
  brandRef: RefObject<HTMLAnchorElement | null>,
  working: boolean,
) {
  const animation = useRef<gsap.core.Timeline | null>(null);
  const workingRef = useRef(working);
  workingRef.current = working;

  useLayoutEffect(() => {
    const brand = brandRef.current;
    const mark = brand?.querySelector<HTMLElement>('.brand-mark');
    const word = brand?.querySelector<HTMLElement>('.brand-word');
    if (!brand || !mark || !word) return;
    const context = gsap.context(() => {
      animation.current = createIslandBrandTimeline(mark, word);
      // Route remounts start settled; only an actual work/idle change should animate the logo.

      animation.current.progress(Number(workingRef.current)).pause();
    }, brand);
    const stopObserving = observeReducedMotion(() => {
      animation.current?.pause().progress(Number(workingRef.current));
    });
    return () => {
      stopObserving();
      context.revert();
      animation.current?.kill();
      animation.current = null;
    };
  }, [brandRef]);

  useLayoutEffect(() => {
    const timeline = animation.current;
    if (!timeline) return;
    if (prefersReducedMotion()) timeline.pause().progress(Number(working));
    else if (working) timeline.play();
    else timeline.reverse();
  }, [working]);
}
