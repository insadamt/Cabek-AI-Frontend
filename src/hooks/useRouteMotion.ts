import { useLayoutEffect, useRef } from 'react';
import { animateElement, motionTiming } from '../lib/motion';

export function useRouteMotion(pathname: string) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    if (previous === pathname || !viewportRef.current) return;
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
