/**
 * Gives each category journey one cancellable presentation owner and completion boundary.
 * Depends on GSAP contexts and shared motion preferences; navigation cancels while resize settles.
 */
import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from './motion';

let cancelActiveJourney: (() => void) | undefined;

export function cancelJourneyMotion() {
  cancelActiveJourney?.();
}

interface JourneyMotionOptions {
  build: (timeline: gsap.core.Timeline) => void;
  restore?: () => void;
  onComplete: () => void;
  onCancel?: () => void;
}

export function runJourneyMotion({ build, restore, onComplete, onCancel }: JourneyMotionOptions) {
  cancelJourneyMotion();
  let finished = false;
  let stopObserving = () => {};
  const timeline = gsap.timeline({ paused: true });
  const context = gsap.context(() => build(timeline));
  function cleanup() {
    stopObserving();
    window.removeEventListener('resize', settle);
    window.removeEventListener('popstate', cancel);
    window.removeEventListener('pagehide', cancel);
    if (cancelActiveJourney === cancel) cancelActiveJourney = undefined;
    timeline.kill();
    context.revert();
    restore?.();
  }
  function complete() {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete();
  }
  function cancel() {
    if (finished) return;
    finished = true;
    cleanup();
    onCancel?.();
  }
  function settle() {
    timeline.progress(1);
  }
  timeline.eventCallback('onComplete', complete);
  cancelActiveJourney = cancel;
  stopObserving = observeReducedMotion(settle);
  window.addEventListener('resize', settle);
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  if (prefersReducedMotion()) settle();
  else timeline.play();
  return cancel;
}
