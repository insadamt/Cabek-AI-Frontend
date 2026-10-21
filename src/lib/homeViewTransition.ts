import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';

gsap.registerPlugin(Flip);
let activeTransition: gsap.core.Timeline | undefined;

export function transitionHomeView(path: string, direction: 'forward' | 'reverse' = 'forward') {
  activeTransition?.progress(1).kill();
  const content = document.querySelector<HTMLElement>('.home-main');
  if (!content || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate(path);
    return;
  }
  const controls = '.home-folder-search, .home-open-dossier, .home-clear-search';
  const getVisibleControls = () =>
    Array.from(content.querySelectorAll<HTMLElement>(controls)).filter(
      (control) => control.getClientRects().length > 0,
    );
  const controlState = Flip.getState(getVisibleControls(), {
    props: 'backgroundColor,color,borderRadius',
  });

  // Keep the page opaque: only controls change position, so clearing cannot flash the background.

  flushSync(() => navigate(path));
  const controlMotion = Flip.from(controlState, {
    targets: getVisibleControls(),
    duration: 0.42,
    ease: 'power2.inOut',
    scale: false,
    paused: true,
  });
  activeTransition = gsap.timeline().add(controlMotion, 0);
  const folders = content.querySelectorAll<HTMLElement>(
    direction === 'reverse'
      ? '.home-carousel-view:not([hidden]) .carousel-stage'
      : '.home-folder-grid',
  );
  activeTransition.fromTo(
    folders,
    { opacity: 0.65, y: direction === 'reverse' ? -10 : 10 },
    { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,transform' },
    0,
  );
  controlMotion.play();
}
