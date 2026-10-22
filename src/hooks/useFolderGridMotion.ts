import { useLayoutEffect, useRef } from 'react';
import { animateElement, prefersReducedMotion } from '../lib/motion';

interface FolderSnapshot {
  bounds: DOMRect;
  clone: HTMLElement;
  left: number;
  top: number;
}

export function useFolderGridMotion(content: unknown, paused = false) {
  const gridRef = useRef<HTMLDivElement>(null);
  const previousFolders = useRef(new Map<string, FolderSnapshot>());
  const wasPaused = useRef(false);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (paused) {
      wasPaused.current = true;
      return;
    }
    const reducedMotion = prefersReducedMotion() || wasPaused.current;
    wasPaused.current = false;
    const origin = grid.getBoundingClientRect();
    const nextFolders = new Map<string, FolderSnapshot>();
    const animations: Animation[] = [];
    const ghosts: HTMLElement[] = [];
    grid.querySelectorAll<HTMLElement>('[data-folder-id]').forEach((folder) => {
      const id = folder.dataset.folderId!;
      const bounds = folder.getBoundingClientRect();
      const previous = previousFolders.current.get(id);
      const left = bounds.left - origin.left + grid.scrollLeft;
      const top = bounds.top - origin.top + grid.scrollTop;
      nextFolders.set(id, { bounds, left, top, clone: folder.cloneNode(true) as HTMLElement });
      if (reducedMotion) return;
      const x = previous ? previous.left - left : 0;
      const y = previous ? previous.top - top : 12;

      // Polling unchanged results must not restart motion or mistake scrolling for rearrangement.

      if (previous && Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      const animation = animateElement(
        folder,
        previous
          ? [
              {
                transform: `translate(${x}px, ${y}px)`,
              },
              { transform: 'translate(0, 0)' },
            ]
          : [
              { opacity: 0, transform: 'translateY(12px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
        { duration: 320 },
      );
      if (animation) animations.push(animation);
    });

    // Detached copies let removed folders leave without keeping stale interactive results mounted.

    if (!reducedMotion)
      previousFolders.current.forEach(({ bounds, clone, left, top }, id) => {
        if (nextFolders.has(id)) return;
        clone.inert = true;
        clone.setAttribute('aria-hidden', 'true');
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${origin.left + left - grid.scrollLeft}px`,
          top: `${origin.top + top - grid.scrollTop}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          pointerEvents: 'none',
          zIndex: '20',
        });
        document.body.appendChild(clone);
        ghosts.push(clone);
        const animation = animateElement(
          clone,
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(.94) translateY(-12px)' },
          ],
          { duration: 220, fill: 'forwards' },
        );
        if (animation) {
          animation.onfinish = () => clone.remove();
          animations.push(animation);
        } else clone.remove();
      });
    previousFolders.current = nextFolders;
    return () => {
      animations.forEach((animation) => animation.cancel());
      ghosts.forEach((ghost) => ghost.remove());
    };
    // Resuming selection captures the restored grid without competing with its return timeline.
  }, [content, paused]);

  return gridRef;
}
