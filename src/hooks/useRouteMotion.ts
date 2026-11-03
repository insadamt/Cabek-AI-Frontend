/**
 * Animates ordinary route changes while allowing the studio and dossier to own their entrance/restore behavior.
 * Depends on shared motion helpers and pathname history; stage returns must not receive a second route animation.
 */
import { useLayoutEffect, useRef } from 'react';
import { animateElement, motionTiming } from '../lib/motion';

export function useRouteMotion(pathname: string) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    if (previous === pathname || !viewportRef.current) return;
    //
    // The studio owns fresh entry and settled Back restoration; a generic fade would replay motion on return.
    //
    if (pathname === '/' || pathname === '/preview/expertise') return;
    // The category handoff owns the island-to-folder flight; moving main would shift its measured origin.
    if (window.history.state?.ejectFolders) return;
    // The dossier owns the folder travel and metadata reveal as one ordered sequence.

    if (/^\/dossiers\/[^/]+\/?$/.test(pathname)) return;
    const content = viewportRef.current.querySelector('main');
    if (!content) return;
    const returning = previous.startsWith(`${pathname}/`) || pathname === '/';
    const animation = animateElement(
      content,
      [
        { opacity: 0.8, transform: `translateY(${returning ? -6 : 6}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: motionTiming.layout },
    );
    return () => animation?.cancel();
  }, [pathname]);
  return viewportRef;
}
