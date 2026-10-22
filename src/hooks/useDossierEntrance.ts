import gsap from 'gsap';
import { useLayoutEffect, useState, type RefObject } from 'react';
import type { DossierEntrance } from '../lib/dossierNavigation';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

interface DossierEntranceOptions {
  container: RefObject<HTMLDivElement | null>;
  entrance?: DossierEntrance;
  ready: boolean;
}

export function useDossierEntrance({ container, entrance, ready }: DossierEntranceOptions) {
  const [complete, setComplete] = useState(false);
  useLayoutEffect(() => {
    const page = container.current;
    const folder = page?.querySelector<HTMLElement>('.dossier-overview-folder');
    const artwork = folder?.querySelector<HTMLElement>('.dossier-folder');
    if (!page || !folder || !artwork || !ready) return;
    function fitFolderArtwork() {
      if (!folder || !artwork?.offsetWidth) return;
      folder.style.setProperty(
        '--dossier-folder-scale',
        String(folder.clientWidth / artwork.offsetWidth),
      );
    }
    fitFolderArtwork();
    const sizeObserver = new ResizeObserver(fitFolderArtwork);
    sizeObserver.observe(folder);
    sizeObserver.observe(artwork);
    const metadata = page.querySelectorAll('[data-dossier-metadata]');
    const destination = folder.getBoundingClientRect();
    const source = entrance?.folderBounds;
    const reducedMotion = prefersReducedMotion();
    let timeline: gsap.core.Timeline;
    const context = gsap.context(() => {
      timeline = gsap.timeline();

      // Keep the slot in layout while fixed artwork escapes the sidebar's scroll clipping.

      const travelling = !!source && !reducedMotion;
      if (travelling) {
        gsap.set(artwork, {
          position: 'fixed',
          left: destination.left,
          top: destination.top,
          zIndex: 101,
        });
      }

      timeline
        .fromTo(
          artwork,
          {
            transformOrigin: '0 0',
            x: travelling ? source.left - destination.left : 0,
            y: travelling ? source.top - destination.top : reducedMotion ? 0 : 10,
            scale: (travelling ? source.width : destination.width) / artwork.offsetWidth,
            opacity: source ? 1 : 0,
          },
          {
            x: 0,
            y: 0,
            scale: destination.width / artwork.offsetWidth,
            opacity: 1,
            duration: reducedMotion ? 0 : source ? 0.45 : 0.2,
            ease: 'power3.inOut',
            clearProps: 'position,left,top,zIndex,transform,transformOrigin,opacity',
          },
        )
        .fromTo(
          metadata,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: reducedMotion ? 0 : 0.2,
            stagger: reducedMotion ? 0 : 0.025,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        )
        .call(() => setComplete(true));
    }, page);

    // A history revisit should show the settled page rather than replay a stale source position.

    if (window.history.state?.dossierEntrance) {
      const { dossierEntrance: _entrance, ...state } = window.history.state;
      window.history.replaceState(state, '', window.location.href);
    }
    const settle = () => timeline.progress(1);
    const stopObserving = observeReducedMotion(settle);
    window.addEventListener('resize', settle);
    return () => {
      window.removeEventListener('resize', settle);
      stopObserving();
      sizeObserver.disconnect();
      folder.style.removeProperty('--dossier-folder-scale');
      context.revert();
      timeline.kill();
    };
  }, [container, entrance, ready]);
  return complete;
}
