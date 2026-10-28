/** Moves the selected category object into its collection marker using the existing GSAP Flip stack. */
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';
import { observeReducedMotion, prefersReducedMotion } from './motion';

gsap.registerPlugin(Flip);
let finishPrevious: (() => void) | undefined;
export function openCategory(path: string, folder: HTMLElement) {
  finishPrevious?.();
  if (prefersReducedMotion()) {
    navigate(path);
    return;
  }
  const state = Flip.getState(folder);
  flushSync(() => navigate(path));
  const destination = document.querySelector<HTMLElement>('[data-category-marker]');
  if (!destination) return;
  const animation = Flip.from(state, {
    targets: destination,
    duration: 0.46,
    ease: 'power3.inOut',
    scale: true,
  });
  const finish = () => animation.progress(1);
  const stop = observeReducedMotion(finish);
  const cleanup = () => {
    stop();
    window.removeEventListener('resize', finish);
    window.removeEventListener('popstate', cancel);
    if (finishPrevious === cancel) finishPrevious = undefined;
  };
  const cancel = () => {
    finish();
    cleanup();
  };
  window.addEventListener('resize', finish);
  window.addEventListener('popstate', cancel, { once: true });
  animation.eventCallback('onComplete', cleanup);
  finishPrevious = cancel;
}
