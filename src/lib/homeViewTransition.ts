/** Coordinates collection controls and folder travel; depends on synchronous navigation, GSAP Flip and reduced-motion cleanup. */
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';
import { observeReducedMotion } from './motion';
import { prepareCollectionSwitch } from './homeCollectionMotion';

gsap.registerPlugin(Flip);
let activeTransition: gsap.core.Timeline | undefined;
let stopObserving: (() => void) | undefined;
let folderSwitch: ReturnType<typeof prepareCollectionSwitch> | undefined;
let stopListening: (() => void) | undefined;

export function finishHomeViewTransition() {
  activeTransition?.progress(1).kill();
  activeTransition = undefined;
  folderSwitch?.finish();
  folderSwitch = undefined;
  stopObserving?.();
  stopObserving = undefined;
  stopListening?.();
  stopListening = undefined;
}

export function transitionHomeView(path: string, direction: 'forward' | 'reverse' = 'forward') {
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
      (control) => control.getClientRects().length > 0,
    );
  const controlState = Flip.getState(getVisibleControls(), {
    props: 'backgroundColor,color,borderRadius',
  });
  const collection = content.querySelector<HTMLElement>('.category-content');
  const destination = new URL(path, window.location.origin);
  const changesLayout =
    new URLSearchParams(window.location.search).has('search') !==
    destination.searchParams.has('search');
  if (collection && changesLayout) folderSwitch = prepareCollectionSwitch(collection);

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
  const controlContents = getVisibleControls().flatMap((control) =>
    Array.from(control.querySelectorAll('.home-action-content, .search-return-form, :scope > svg')),
  );
  if (controlContents.length)
    activeTransition.fromTo(
      controlContents,
      { opacity: 0 },
      { opacity: 1, duration: 0.18, clearProps: 'opacity' },
      0.14,
    );
  const folders = content.querySelectorAll<HTMLElement>(
    direction === 'reverse'
      ? '.home-carousel-view:not([hidden]) .carousel-stage'
      : '.home-folder-grid',
  );
  if (!folderSwitch)
    activeTransition.fromTo(
      folders,
      { opacity: 0.65, y: direction === 'reverse' ? -10 : 10 },
      { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,transform' },
      0,
    );
  const navigation = content.querySelectorAll(
    '.home-carousel-view:not([hidden]) .carousel-navigation, .home-search-heading, .home-search-pagination, .home-bottom-bar > .dossier-actions',
  );
  if (navigation.length)
    activeTransition.fromTo(
      navigation,
      { opacity: 0, y: direction === 'reverse' ? -6 : 6 },
      { opacity: 1, y: 0, duration: 0.22, clearProps: 'opacity,transform' },
      0.22,
    );
  folderSwitch?.play();
  controlMotion.play();
  stopObserving = observeReducedMotion(finishHomeViewTransition);
  window.addEventListener('resize', finishHomeViewTransition);
  window.addEventListener('popstate', finishHomeViewTransition);
  window.addEventListener('scroll', finishHomeViewTransition, true);
  stopListening = () => {
    window.removeEventListener('resize', finishHomeViewTransition);
    window.removeEventListener('popstate', finishHomeViewTransition);
    window.removeEventListener('scroll', finishHomeViewTransition, true);
  };
}
