/**
 * Gives folder surfaces one reversible opacity transition while controls keep their independent layout motion.
 * Depends on loaded grid readiness, native view refs, GSAP and reduced-motion preferences.
 */
import gsap from 'gsap';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

interface CollectionFadeOptions {
  carousel: HTMLElement;
  grid: HTMLElement;
  gridRequested: boolean;
  gridReady: boolean;
  immediate?: boolean;
}

export function createCollectionFade({
  carousel,
  grid,
  gridRequested,
  gridReady,
  immediate,
}: CollectionFadeOptions) {
  const showGrid = gridRequested && gridReady;
  const timeline = gsap.timeline();
  const surfaces = [
    {
      view: carousel,
      active: !showGrid,
      requested: !gridRequested,
      selector: '.carousel-stage, .carousel-navigation, .home-state',
    },
    {
      view: grid,
      active: showGrid,
      requested: gridRequested,
      selector: '.home-folder-grid, .home-search-heading, .home-search-pagination',
    },
  ];
  surfaces.forEach(({ view, active, requested, selector }) => {
    const elements = view.querySelectorAll<HTMLElement>(selector);
    if (active || requested) view.hidden = false;
    if (!elements.length) {
      view.hidden = !active && !requested;
      return;
    }
    if (!view.dataset.fadeInitialized) {
      gsap.set(elements, { opacity: active ? 1 : 0 });
      view.dataset.fadeInitialized = 'true';
    }

    // Tween current opacity instead of restarting from zero when the user reverses direction.

    timeline.to(
      elements,
      {
        opacity: active ? 1 : 0,
        duration: immediate ? 0 : 0.24,
        ease: 'power1.inOut',
        onComplete: () => {
          view.hidden = !active && !requested;
        },
      },
      0,
    );
  });
  return timeline;
}

export function useCollectionViewFade(
  carouselRef: RefObject<HTMLDivElement | null>,
  gridRef: RefObject<HTMLDivElement | null>,
  gridRequested: boolean,
  gridReady: boolean,
) {
  const initialized = useRef(false);
  useLayoutEffect(() => {
    const carousel = carouselRef.current;
    const grid = gridRef.current;
    if (!carousel || !grid) return;
    const timeline = createCollectionFade({
      carousel,
      grid,
      gridRequested,
      gridReady,
      immediate: !initialized.current || prefersReducedMotion(),
    });
    initialized.current = true;
    const finish = () => timeline.progress(1);
    const stopObserving = observeReducedMotion(finish);
    window.addEventListener('resize', finish);
    return () => {
      // Killing retains the current opacity so a replacement fade can reverse without a flash.

      timeline.kill();
      stopObserving();
      window.removeEventListener('resize', finish);
    };
  }, [carouselRef, gridRef, gridRequested, gridReady]);
}
