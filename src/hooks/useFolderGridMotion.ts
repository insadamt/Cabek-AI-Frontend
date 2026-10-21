import { useLayoutEffect, useRef } from 'react';

interface FolderSnapshot {
  bounds: DOMRect;
  clone: HTMLElement;
}

export function useFolderGridMotion(content: unknown, paused = false) {
  const gridRef = useRef<HTMLDivElement>(null);
  const previousFolders = useRef(new Map<string, FolderSnapshot>());

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || paused) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextFolders = new Map<string, FolderSnapshot>();
    const animations: Animation[] = [];
    const ghosts: HTMLElement[] = [];
    grid.querySelectorAll<HTMLElement>('[data-folder-id]').forEach((folder) => {
      const id = folder.dataset.folderId!;
      const bounds = folder.getBoundingClientRect();
      const previous = previousFolders.current.get(id);
      nextFolders.set(id, { bounds, clone: folder.cloneNode(true) as HTMLElement });
      if (reducedMotion) return;
      animations.push(
        folder.animate(
          previous
            ? [
                {
                  transform: `translate(${previous.bounds.left - bounds.left}px, ${previous.bounds.top - bounds.top}px)`,
                },
                { transform: 'translate(0, 0)' },
              ]
            : [
                { opacity: 0, transform: 'translateY(18px) scale(.96)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' },
              ],
          { duration: 320, easing: 'cubic-bezier(.22,.8,.2,1)' },
        ),
      );
    });

    // Detached copies let removed folders leave without keeping stale interactive results mounted.

    if (!reducedMotion)
      previousFolders.current.forEach(({ bounds, clone }, id) => {
        if (nextFolders.has(id)) return;
        clone.inert = true;
        clone.setAttribute('aria-hidden', 'true');
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          pointerEvents: 'none',
          zIndex: '20',
        });
        document.body.appendChild(clone);
        ghosts.push(clone);
        const animation = clone.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(.94) translateY(-12px)' },
          ],
          { duration: 220, fill: 'forwards' },
        );
        animation.onfinish = () => clone.remove();
        animations.push(animation);
      });
    previousFolders.current = nextFolders;
    return () => {
      animations.forEach((animation) => animation.cancel());
      ghosts.forEach((ghost) => ghost.remove());
    };
    // Selection has its own Flip timeline; only new result data should start grid rearrangement.
  }, [content]);

  return gridRef;
}
