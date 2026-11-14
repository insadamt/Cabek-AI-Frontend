/** Recognize five rapid island clicks while preserving single-click home navigation.
 * Depends on React refs and a cleaned-up timer; no lighting commands run here. */
import { useEffect, useRef } from 'react';

export const islandClickGapMs = 600;

export function useIslandSettingsGesture(openSettings: () => void) {
  const sequence = useRef({
    count: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    fallback: undefined as (() => void) | undefined,
  });
  useEffect(() => () => clearTimeout(sequence.current.timer), []);

  return (singleClickAction?: () => void) => {
    const current = sequence.current;
    clearTimeout(current.timer);
    current.count += 1;
    current.fallback = singleClickAction;
    if (current.count === 5) {
      current.count = 0;
      current.fallback = undefined;
      openSettings();
      return;
    }
    current.timer = setTimeout(() => {
      current.count = 0;
      const fallback = current.fallback;
      current.fallback = undefined;
      fallback?.();
    }, islandClickGapMs);
  };
}
