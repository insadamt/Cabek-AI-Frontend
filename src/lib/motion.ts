export const motionTiming = {
  feedback: 160,
  text: 200,
  disclosure: 240,
  layout: 320,
} as const;

export const motionEasing = 'cubic-bezier(.22,.8,.2,1)';

export function prefersReducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function observeReducedMotion(finishMotion: () => void) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const handleChange = () => {
    if (preference.matches) finishMotion();
  };
  preference.addEventListener?.('change', handleChange);
  return () => preference.removeEventListener?.('change', handleChange);
}

export function animateElement(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {},
) {
  if (prefersReducedMotion() || !element.animate) return;
  const animation = element.animate(keyframes, {
    duration: motionTiming.text,
    easing: motionEasing,
    ...options,
  });

  // Finish at the real UI state when the user changes their preference mid-animation.

  const stopObserving = observeReducedMotion(() => animation.finish());
  void animation.finished.then(stopObserving, stopObserving);
  return animation;
}
