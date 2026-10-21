import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';

export function useEntrance(container: RefObject<HTMLElement | null>, dependency: string) {
  useLayoutEffect(() => {
    if (!container.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      // Offscreen cards stay visible, so a long mobile list never waits for an entrance sequence.

      const visibleElements = [...container.current!.querySelectorAll('[data-enter]')].filter(
        (element) => element.getBoundingClientRect().top < window.innerHeight,
      );
      gsap.fromTo(
        visibleElements,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: Math.min(0.035, 0.15 / Math.max(1, visibleElements.length)),
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
      );
    }, container);
    return () => context.revert();
  }, [container, dependency]);
}
