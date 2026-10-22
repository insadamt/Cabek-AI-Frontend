import { useLayoutEffect, useRef, type RefObject } from 'react';
import { animateElement, motionTiming } from '../lib/motion';

export function useDossierListMotion(
  containerRef: RefObject<HTMLElement | null>,
  content: unknown,
  rowView: boolean,
) {
  const positions = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const nextPositions = new Map<string, { left: number; top: number }>();
    const animations: Animation[] = [];
    container.querySelectorAll<HTMLElement>('[data-dossier-id]').forEach((card) => {
      const bounds = card.getBoundingClientRect();
      const id = card.dataset.dossierId!;
      const destination = { left: bounds.left - origin.left, top: bounds.top - origin.top };
      const previous = positions.current.get(id);
      nextPositions.set(id, destination);
      const x = previous ? previous.left - destination.left : 0;
      const y = previous ? previous.top - destination.top : 8;
      if (previous && Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;

      // Translate natural-size cards so switching presentation never stretches their text.

      const animation = animateElement(
        card,
        [
          { transform: `translate(${x}px, ${y}px)`, opacity: previous ? 1 : 0 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ],
        { duration: motionTiming.layout },
      );
      if (animation) animations.push(animation);
    });
    positions.current = nextPositions;
    return () => animations.forEach((animation) => animation.cancel());
  }, [containerRef, content, rowView]);
}
