/**
 * Reveals the settings panel addressed by navigation, guide links or browser history.
 * Depends on stable heading IDs and the page scroll container; selection never invokes a device command.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

export function useSettingsSection(
  sectionIds: readonly string[],
  page: RefObject<HTMLDivElement | null>,
) {
  function sectionFromHash() {
    const requested = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
    return sectionIds.includes(requested) ? requested : sectionIds[0];
  }

  const [activeSection, setActiveSection] = useState(sectionFromHash);
  const focusRequested = useRef(
    typeof window !== 'undefined' && sectionIds.includes(window.location.hash.slice(1)),
  );

  useEffect(() => {
    function followHash() {
      focusRequested.current = true;
      setActiveSection(sectionFromHash());
    }
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [sectionIds]);

  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    const target = document.getElementById(activeSection);
    if (!target || !page.current?.contains(target)) return;

    // Focus after React unhides the panel so keyboard and guide links share a destination.

    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    page.current.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSection, page]);

  return activeSection;
}
