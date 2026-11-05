/**
 * Carries visible folders between collection layouts without changing native carousel transforms.
 * Depends on frozen viewport artwork, GSAP and a bounded wait for asynchronous grid results.
 */
import gsap from 'gsap';
import { createFolderFlight } from './folderFlight';

const folderSelector = '.dossier-folder[data-dossier-id]';

function visibleFolders(scope: HTMLElement) {
  const viewport = scope.getBoundingClientRect();
  return Array.from(scope.querySelectorAll<HTMLElement>(folderSelector)).filter((folder) => {
    if (!folder.getClientRects().length) return false;
    const bounds = folder.getBoundingClientRect();
    const gridBounds = folder.closest('.home-folder-grid')?.getBoundingClientRect();
    const top = Math.max(viewport.top, gridBounds?.top ?? viewport.top);
    const bottom = Math.min(viewport.bottom, gridBounds?.bottom ?? viewport.bottom);
    return (
      bounds.width > 0 &&
      bounds.bottom > top &&
      bounds.top < bottom &&
      bounds.right > viewport.left &&
      bounds.left < viewport.right
    );
  });
}

function freezeFolder(folder: HTMLElement) {
  const bounds = folder.getBoundingClientRect();
  const layer = createFolderFlight(folder);
  const artwork = layer.firstElementChild as HTMLElement;

  // Frozen child styles retain native dimensions; scale the whole artwork rather than rewrapping text.

  Object.assign(artwork.style, {
    width: `${folder.offsetWidth}px`,
    height: `${folder.offsetHeight}px`,
    transformOrigin: '0 0',
    transform: `scale(${bounds.width / folder.offsetWidth}, ${bounds.height / folder.offsetHeight})`,
  });
  layer.style.transformOrigin = '0 0';
  return { id: folder.dataset.dossierId!, bounds, layer };
}

export function prepareCollectionSwitch(scope: HTMLElement) {
  const center = scope.getBoundingClientRect().left + scope.clientWidth / 2;
  const sources = visibleFolders(scope)
    .sort((left, right) => {
      const priority = (folder: HTMLElement) => {
        if (folder.closest('.is-active, .has-selected-folder')) return -1;
        const bounds = folder.getBoundingClientRect();
        return Math.abs(bounds.left + bounds.width / 2 - center);
      };
      return priority(left) - priority(right);
    })
    .slice(0, 3)
    .map(freezeFolder);
  const previousInert = scope.inert;
  const hiddenFolders = new Map<HTMLElement, string>();
  let timeline: gsap.core.Timeline | undefined;
  let finished = false;
  let started = false;
  let observer: MutationObserver | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  scope.dataset.collectionSwitch = 'pending';
  scope.inert = true;

  function restore() {
    if (finished) return;
    finished = true;
    observer?.disconnect();
    clearTimeout(timeout);
    sources.forEach(({ layer }) => layer.remove());
    hiddenFolders.forEach((visibility, folder) => {
      folder.style.visibility = visibility;
    });
    scope.inert = previousInert;
    delete scope.dataset.collectionSwitch;
  }

  function finish() {
    timeline?.progress(1).kill();
    restore();
  }

  function reveal() {
    if (started || finished) return;
    const folders = visibleFolders(scope);
    if (!folders.length) return;
    started = true;
    observer?.disconnect();
    clearTimeout(timeout);
    const destinations = new Map(folders.map((folder) => [folder.dataset.dossierId!, folder]));
    const matched = new Set<HTMLElement>();
    timeline = gsap.timeline({ onComplete: restore });
    sources.forEach(({ id, bounds, layer }, index) => {
      const target = destinations.get(id);
      if (!target) {
        timeline!.to(layer, { opacity: 0, y: -14, duration: 0.18, ease: 'power2.out' }, 0);
        return;
      }
      matched.add(target);
      const destination = target.getBoundingClientRect();
      hiddenFolders.set(target, target.style.visibility);
      target.style.visibility = 'hidden';
      const start = index * 0.025;
      timeline!.to(
        layer,
        {
          x: destination.left - bounds.left,
          y: destination.top - bounds.top,
          scaleX: destination.width / bounds.width,
          scaleY: destination.height / bounds.height,
          duration: 0.44,
          ease: 'power3.inOut',
        },
        start,
      );
      timeline!.call(
        () => {
          target.style.visibility = hiddenFolders.get(target)!;
        },
        [],
        start + 0.36,
      );
      timeline!.to(layer, { opacity: 0, duration: 0.1 }, start + 0.36);
    });
    const entering = folders
      .filter((folder) => !matched.has(folder))
      .map(
        (folder) =>
          folder.closest<HTMLElement>('.home-grid-folder, .carousel-folder-slot') ?? folder,
      );
    if (entering.length)
      timeline.fromTo(
        entering,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.22,
          stagger: { each: 0.025, amount: 0.12 },
          clearProps: 'opacity',
        },
        0.12,
      );
    const details = scope.querySelectorAll(
      '.home-result-title, .home-grid-folder > .status-badge, .home-grid-folder > .dossier-actions',
    );
    if (details.length)
      timeline.fromTo(
        details,
        { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.18, clearProps: 'opacity,transform' },
        0.3,
      );
    if (!sources.length && !entering.length) restore();
  }

  function play() {
    if (finished) return;
    reveal();
    if (started) return;
    observer = new MutationObserver(reveal);
    observer.observe(scope, { childList: true, subtree: true });

    // Slow or failed reads keep their ordinary loading UI; animation must never hold interaction hostage.

    timeout = setTimeout(() => {
      observer?.disconnect();
      if (!sources.length) {
        restore();
        return;
      }
      timeline = gsap.timeline({ onComplete: restore }).to(
        sources.map(({ layer }) => layer),
        { opacity: 0, duration: 0.16 },
      );
    }, 650);
  }

  return { play, finish };
}
