import { useEffect, useLayoutEffect, useRef } from 'react';
import { animateElement, motionTiming } from '../lib/motion';

export function useSelectionIndicator<T extends HTMLElement = HTMLDivElement>(
  selection: unknown,
  selectedSelector = '.selected',
) {
  const containerRef = useRef<T>(null);
  const initialized = useRef(false);
  const animation = useRef<Animation | undefined>(undefined);
  useEffect(() => () => animation.current?.cancel(), []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = container?.querySelector<HTMLElement>('.selection-indicator');
    const selected = container?.querySelector<HTMLElement>(selectedSelector);
    if (!container || !indicator) return;
    if (!selected) {
      animation.current?.cancel();
      indicator.style.width = '0px';
      indicator.style.height = '0px';
      container.classList.remove('has-selection-indicator');
      initialized.current = false;
      return;
    }

    function moveIndicator() {
      if (!container || !indicator || !selected) return;
      const start = getComputedStyle(indicator);
      const previous = { transform: start.transform, width: start.width, height: start.height };
      animation.current?.cancel();
      const bounds = selected.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      const destination = {
        transform: `translate(${bounds.left - origin.left + container.scrollLeft - container.clientLeft}px, ${bounds.top - origin.top + container.scrollTop - container.clientTop}px)`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      };
      Object.assign(indicator.style, destination);
      container.classList.add('has-selection-indicator');
      if (initialized.current)
        animation.current = animateElement(indicator, [previous, destination], {
          duration: motionTiming.disclosure,
        });
      initialized.current = true;
    }

    moveIndicator();
    const observer = new ResizeObserver(moveIndicator);
    observer.observe(container);
    observer.observe(selected);
    return () => {
      observer.disconnect();
    };
  }, [selection, selectedSelector]);

  return containerRef;
}
