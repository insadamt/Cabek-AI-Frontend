import { useLayoutEffect, useRef, type RefObject } from 'react';
import { animateElement } from '../lib/motion';

export function useEntrance(container: RefObject<HTMLElement | null>, dependency: string) {
  const entered = useRef(new WeakSet<Element>());
  useLayoutEffect(() => {
    if (!container.current) return;
    const animations: Animation[] = [];
    const elements = [...container.current.querySelectorAll('[data-enter]')];
    let entranceIndex = 0;
    elements.forEach((element) => {
      if (entered.current.has(element)) return;
      entered.current.add(element);

      // Existing headings and offscreen content stay steady across refreshes and status changes.

      const bounds = element.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
      const animation = animateElement(
        element,
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 280, delay: Math.min(entranceIndex++ * 25, 100), fill: 'backwards' },
      );
      if (animation) animations.push(animation);
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [container, dependency]);
}
