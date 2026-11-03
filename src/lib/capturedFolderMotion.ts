/** A closing bounce and short approach complete an already saved capture; depends on GSAP and cancellable motion preferences. */
import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from './motion';

export function approachCapturedFolder(folder: HTMLElement, signal: AbortSignal) {
  signal.throwIfAborted();
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const originalTransform = folder.style.transform;
    const timeline = gsap.timeline({ paused: true });
    timeline
      .to(folder, { scale: 0.985, duration: 0.1 })
      .to(folder, { scale: 1, duration: 0.28, ease: 'back.out(2)' })
      .to(folder, { scale: 1.12, duration: 0.38, ease: 'power2.in' }, '+=.25');
    const settle = () => timeline.progress(1);
    function cleanup() {
      stop();
      signal.removeEventListener('abort', cancel);
      window.removeEventListener('resize', settle);
      timeline.kill();
    }
    function cancel() {
      cleanup();
      folder.style.transform = originalTransform;
      reject(new DOMException('Aborted', 'AbortError'));
    }
    const stop = observeReducedMotion(settle);
    timeline.eventCallback('onComplete', () => {
      cleanup();
      resolve();
    });
    signal.addEventListener('abort', cancel, { once: true });
    window.addEventListener('resize', settle);
    timeline.play();
  });
}
