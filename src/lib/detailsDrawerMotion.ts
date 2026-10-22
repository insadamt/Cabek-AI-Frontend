import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from './motion';

export function openDetailsDrawer(element: HTMLDialogElement, onClosed: () => void) {
  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;
  let animation: gsap.core.Tween | undefined;
  let closing = false;
  let disposed = false;
  let closeCompleted = false;
  let afterClose: (() => void) | undefined;

  function finishClose() {
    if (disposed || closeCompleted) return;
    closeCompleted = true;
    onClosed();
  }

  function requestClose(continuation?: () => void) {
    if (closing || disposed) return;
    closing = true;
    afterClose = continuation;
    animation?.kill();
    element.classList.add('is-closing');
    if (prefersReducedMotion()) {
      finishClose();
      return;
    }
    const mobile = matchMedia(
      '(max-width: 767px), (max-width: 950px) and (max-height: 520px)',
    ).matches;
    animation = gsap.to(element, {
      xPercent: mobile ? 0 : 100,
      yPercent: 0,
      y: mobile ? 18 : 0,
      opacity: mobile ? 0 : 1,
      duration: mobile ? 0.14 : 0.16,
      ease: 'power2.inOut',
      onComplete: finishClose,
    });
  }

  document.body.style.overflow = 'hidden';
  element.showModal();
  element.classList.remove('is-closing');
  if (!prefersReducedMotion()) {
    const mobile = matchMedia(
      '(max-width: 767px), (max-width: 950px) and (max-height: 520px)',
    ).matches;
    animation = gsap.fromTo(
      element,
      { xPercent: mobile ? 0 : 100, yPercent: 0, y: mobile ? 24 : 0, opacity: mobile ? 0 : 1 },
      {
        xPercent: 0,
        yPercent: 0,
        y: 0,
        opacity: 1,
        duration: mobile ? 0.18 : 0.2,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
    );
  }
  const settle = () => animation?.progress(1);
  const stopObserving = observeReducedMotion(settle);
  window.addEventListener('resize', settle);

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopObserving();
    window.removeEventListener('resize', settle);
    animation?.kill();
    element.close();
    document.body.style.overflow = previousOverflow;
    // Evidence navigation must happen after the native modal releases focus and page inertness.

    if (closeCompleted && afterClose) afterClose();
    else if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  return { requestClose, dispose };
}
