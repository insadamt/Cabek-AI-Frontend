/** Morphs collection controls while native view containers fade; depends on synchronous navigation, GSAP Flip and reduced-motion cleanup. */
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';
import { observeReducedMotion } from './motion';

gsap.registerPlugin(Flip);
let activeTransition: gsap.core.Timeline | undefined;
let stopObserving: (() => void) | undefined;
let stopListening: (() => void) | undefined;

export function finishHomeViewTransition() {
  activeTransition?.progress(1).kill();
  activeTransition = undefined;
  stopObserving?.();
  stopObserving = undefined;
  stopListening?.();
  stopListening = undefined;
}

export function transitionHomeView(path: string, _direction: 'forward' | 'reverse' = 'forward') {
  finishHomeViewTransition();
  const content = document.querySelector<HTMLElement>('.home-main');
  if (!content || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate(path);
    return;
  }
  const controls =
    '.home-folder-search, .home-search-return, .home-open-dossier, .home-clear-search';
  const getVisibleControls = () =>
    Array.from(content.querySelectorAll<HTMLElement>(controls)).filter(
      (control) =>
        control.getClientRects().length > 0 && !control.closest('[data-collection-active="false"]'),
    );
  const controlState = Flip.getState(getVisibleControls(), {
    props: 'backgroundColor,color,borderRadius',
  });

  // Keep the page opaque: only controls change position, so clearing cannot flash the background.

  flushSync(() => navigate(path));
  const controlMotion = Flip.from(controlState, {
    targets: getVisibleControls(),
    duration: 0.46,
    ease: 'power2.inOut',
    scale: false,
    paused: true,
  });
  activeTransition = gsap.timeline().add(controlMotion, 0);
  controlMotion.play();
  stopObserving = observeReducedMotion(finishHomeViewTransition);
  window.addEventListener('resize', finishHomeViewTransition);
  window.addEventListener('popstate', finishHomeViewTransition);
  stopListening = () => {
    window.removeEventListener('resize', finishHomeViewTransition);
    window.removeEventListener('popstate', finishHomeViewTransition);
  };
}
