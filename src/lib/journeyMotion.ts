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
  deferRestore?: boolean;
  preserveLaunch?: boolean;
}

export function runJourneyMotion({
  build,
  restore,
  onComplete,
  onCancel,
  deferRestore,
  preserveLaunch,
}: JourneyMotionOptions) {
  cancelJourneyMotion();
  let finished = false;
  let stopObserving = () => {};
  let frame: number | undefined;
  let previousFrame: number | undefined;
  let elapsed = 0;
  const timeline = gsap.timeline({ paused: true });
  const context = gsap.context(() => build(timeline));
  function cleanup(completed: boolean) {
    stopObserving();
    if (frame !== undefined) window.cancelAnimationFrame?.(frame);
    window.removeEventListener('resize', settle);
    window.removeEventListener('popstate', cancel);
    window.removeEventListener('pagehide', cancel);
    if (cancelActiveJourney === cancel) cancelActiveJourney = undefined;
    timeline.kill();
    const restorePresentation = () => {
      context.revert();
      restore?.();
    };

    // Keep the departing page hidden until React commits navigation; restoring it in this frame flashes the old page.

    if (
      completed &&
      deferRestore &&
      !prefersReducedMotion() &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      window.requestAnimationFrame(restorePresentation);
    } else {
      restorePresentation();
    }
  }
  function complete() {
    if (finished) return;
    finished = true;
    cleanup(true);
    onComplete();
  }
  function cancel() {
    if (finished) return;
    finished = true;
    cleanup(false);
    onCancel?.();
  }
  function settle() {
    timeline.progress(1);
  }
  function renderFrame(now: number) {
    frame = undefined;
    if (finished) return;

    // Expensive first paints must not consume the launch while nothing has been displayed.

    if (previousFrame !== undefined)
      elapsed += Math.min(Math.max(0, now - previousFrame) / 1000, 1 / 30);
    previousFrame = now;
    timeline.time(Math.min(elapsed, timeline.duration()), false);
    if (!finished) frame = window.requestAnimationFrame(renderFrame);
  }
  timeline.eventCallback('onComplete', complete);
  cancelActiveJourney = cancel;
  stopObserving = observeReducedMotion(settle);
  window.addEventListener('resize', settle);
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  if (prefersReducedMotion()) settle();
  else if (preserveLaunch && typeof window.requestAnimationFrame === 'function') {
    frame = window.requestAnimationFrame(renderFrame);
  } else timeline.play();
  return cancel;
}
