/**
 * Adds Escape and outside-pointer dismissal to native filter disclosures without changing their open state ownership.
 * Depends on the browser details element; Escape restores the summary focus while outside clicks keep their destination.
 */
import { useEffect, useRef } from 'react';

export function useDismissibleDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    function dismissOutside(event: PointerEvent) {
      if (!details?.open || !(event.target instanceof Node) || details.contains(event.target))
        return;
      details.open = false;
    }

    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || !details?.open) return;
      event.preventDefault();
      details.open = false;

      // Return keyboard users to the trigger before its fields leave the focus order.

      details.querySelector('summary')?.focus({ preventScroll: true });
    }

    document.addEventListener('pointerdown', dismissOutside);
    details.addEventListener('keydown', dismissWithEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      details.removeEventListener('keydown', dismissWithEscape);
    };
  }, []);

  return detailsRef;
}
