import { useLayoutEffect, type RefObject } from 'react';

export function useFolderGridScale(sectionRef: RefObject<HTMLElement | null>, content: unknown) {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const grid = section?.querySelector<HTMLElement>('.home-folder-grid');
    const artwork = grid?.querySelector<HTMLElement>('.dossier-folder');
    if (!section || !grid || !artwork) return;

    function updateGridScale() {
      if (!section || !grid || !artwork || !artwork.offsetWidth) return;
      const gridStyle = getComputedStyle(grid);
      const columns = Number(getComputedStyle(section).getPropertyValue('--folder-grid-columns'));
      const horizontalPadding =
        parseFloat(gridStyle.paddingLeft) + parseFloat(gridStyle.paddingRight);
      const columnGap = parseFloat(gridStyle.columnGap);
      const cellWidth =
        (grid.clientWidth - horizontalPadding - columnGap * (columns - 1)) / columns;

      // Measure native artwork separately so fitting columns never reflows the folder's contents.

      const scale = Math.min(0.8, Math.max(0, cellWidth / artwork.offsetWidth));
      section.style.setProperty('--folder-grid-scale', String(scale));
    }

    updateGridScale();
    const observer = new ResizeObserver(updateGridScale);
    observer.observe(section);
    observer.observe(artwork);
    return () => observer.disconnect();
  }, [sectionRef, content]);
}
