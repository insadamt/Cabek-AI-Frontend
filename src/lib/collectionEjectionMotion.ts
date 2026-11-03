/**
 * Releases saved dossiers from the island into their native carousel poses, retaining each folder's complete shape.
 * Depends on GSAP and carousel CSS; slot-level translation avoids tilted child coordinates and temporary overflow allows the full path.
 */
import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from './motion';

export function ejectCollectionFolders(
  scope: HTMLElement,
  island: HTMLElement,
  onComplete: () => void,
) {
  const slots = Array.from(scope.querySelectorAll<HTMLElement>('.carousel-folder-slot'))
    .sort(
      (left, right) =>
        Number(right.classList.contains('is-active')) -
        Number(left.classList.contains('is-active')),
    )
    .slice(0, 3);
  if (!slots.length) return;
  if (prefersReducedMotion()) {
    onComplete();
    return;
  }

  const collection = scope.closest<HTMLElement>('.category-collection');
  const overflowOwners = [scope, ...(collection ? [collection] : [])];
  const previousOverflow = overflowOwners.map((element) => element.style.overflow);
  const previousInert = collection?.inert ?? scope.inert;
  const interactionOwner = collection ?? scope;
  const previousTransitions = slots.map((element) => element.style.transition);
  const controls = Array.from(
    (collection ?? scope).querySelectorAll<HTMLElement>(
      '.category-controls, .carousel-backdrop-word, .carousel-edge, .home-bottom-bar, .carousel-counter',
    ),
  );
  const origin = island.getBoundingClientRect();
  let disposed = false;
  let completed = false;
  interactionOwner.inert = true;
  overflowOwners.forEach((element) => {
    element.style.overflow = 'visible';
  });
  scope.dataset.ejecting = 'true';

  const timeline = gsap.timeline({ paused: true });
  timeline
    .to(island, { scale: 1.06, duration: 0.18, ease: 'power2.out' }, 0)
    .to(island, { scale: 1, duration: 0.3, ease: 'power2.inOut' }, 0.65);

  slots.forEach((slot, index) => {
    const bounds = slot.getBoundingClientRect();
    const x = Number(gsap.getProperty(slot, 'x'));
    const y = Number(gsap.getProperty(slot, 'y'));
    const scale = Number(gsap.getProperty(slot, 'scaleX'));
    slot.style.transition = 'none';
    timeline.fromTo(
      slot,
      {
        opacity: 0,
        scale: 0.12,
        x: x + origin.left + origin.width / 2 - bounds.left - bounds.width / 2,
        y: y + origin.bottom - 10 - bounds.top - bounds.height / 2,
      },
      {
        opacity: 1,
        scale,
        x,
        y,
        duration: 0.85,
        ease: 'power3.out',
      },
      0.12 + index * 0.18,
    );
  });
  timeline.fromTo(controls, { opacity: 0 }, { opacity: 1, duration: 0.28 }, 0.85);

  const settle = () => timeline.progress(1);
  const stopObserving = observeReducedMotion(settle);
  function restore() {
    stopObserving();
    window.removeEventListener('resize', settle);
    gsap.set(slots, { clearProps: 'transform,opacity' });
    gsap.set(controls, { clearProps: 'opacity' });
    gsap.set(island, { clearProps: 'scale' });
    slots.forEach((slot, index) => {
      slot.style.transition = previousTransitions[index];
    });
    overflowOwners.forEach((element, index) => {
      element.style.overflow = previousOverflow[index];
    });
    interactionOwner.inert = previousInert;
    delete scope.dataset.ejecting;
  }
  timeline.eventCallback('onComplete', () => {
    if (disposed || completed) return;
    completed = true;
    restore();
    onComplete();
  });
  window.addEventListener('resize', settle);
  timeline.play();
  return () => {
    disposed = true;
    timeline.kill();
    if (!completed) restore();
  };
}
