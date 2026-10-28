/** Local GSAP reveals for category objects and photo changes; depends on shared motion preferences. */
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

export function useWorkflowReveal(selection: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        '[data-workflow-reveal]',
        { opacity: 0, y: prefersReducedMotion() ? 0 : 14 },
        {
          opacity: 1,
          y: 0,
          duration: prefersReducedMotion() ? 0 : 0.32,
          stagger: 0.035,
          clearProps: 'opacity,transform',
          ease: 'power2.out',
        },
      );
    }, ref);
    const finish = () => {
      context.getTweens().forEach((tween: gsap.core.Tween) => tween.progress(1));
    };
    const stop = observeReducedMotion(finish);
    window.addEventListener('resize', finish);
    return () => {
      stop();
      window.removeEventListener('resize', finish);
      context.revert();
    };
  }, [selection]);
  return ref;
}
