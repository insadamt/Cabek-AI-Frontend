/** Uniform folder absorption keeps both glass faces intact; depends on GSAP and the existing island geometry. */
import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from './motion';

export function absorbCategoryFolder(
  folder: HTMLElement,
  peers: HTMLElement[],
  island: HTMLElement,
  onComplete: () => void,
) {
  const origin = folder.getBoundingClientRect();
  const target = island.getBoundingClientRect();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    stopObserving();
    window.removeEventListener('resize', settle);
    onComplete();
  };
  const timeline = gsap.timeline({ paused: true, onComplete: finish });
  timeline
    .to(peers, { opacity: 0, scale: 0.88, y: 25, duration: 0.3 }, 0)
    .to(folder, { scale: 0.2, duration: 0.42, ease: 'power2.inOut' }, 0.12)
    .to(
      folder,
      {
        x: target.left + target.width / 2 - origin.left - origin.width / 2,
        y: target.top + target.height / 2 - origin.top - origin.height / 2,
        duration: 0.65,
        ease: 'power3.inOut',
      },
      0.25,
    )
    .to(island, { scale: 1.06, duration: 0.2 }, 0.65)
    .to(folder, { opacity: 0, scale: 0.14, duration: 0.18 }, 0.8)
    .to(island, { scale: 1, duration: 0.25 }, 0.85);
  const settle = () => timeline.progress(1);
  const stopObserving = observeReducedMotion(settle);
  window.addEventListener('resize', settle);
  if (prefersReducedMotion()) settle();
  else timeline.play();
  return () => {
    stopObserving();
    window.removeEventListener('resize', settle);
    timeline.kill();
    gsap.set(island, { clearProps: 'scale' });
  };
}
