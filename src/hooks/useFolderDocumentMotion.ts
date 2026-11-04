/** Centers the folded vehicle sheet within its folder and drives reversible extraction using GSAP and measured layout dimensions. */
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { observeReducedMotion } from '../lib/motion';

interface FolderDocumentMotionOptions {
  isOpen: boolean;
  onMotionChange: (moving: boolean) => void;
}

function measurePocketTransform(paper: HTMLElement, folder: HTMLElement) {
  const rotationRadians = (3 * Math.PI) / 180;
  const sine = Math.sin(rotationRadians);
  const cosine = Math.cos(rotationRadians);
  const rotatedWidth = paper.offsetWidth * cosine + paper.offsetHeight * sine;
  const rotatedHeight = paper.offsetHeight * cosine + paper.offsetWidth * sine;
  const scale = Math.min(
    1,
    (folder.offsetWidth * 0.88) / rotatedWidth,
    (folder.offsetHeight * 0.88) / rotatedHeight,
  );

  // Use the actual layout offset: responsive positioning can leave the sheet off-center.
  // Compensate for its top-center rotation origin after aligning the layout box.

  return {
    x:
      folder.offsetWidth / 2 -
      paper.offsetLeft -
      paper.offsetWidth / 2 -
      (paper.offsetHeight * sine * scale) / 2,
    y: (folder.offsetHeight - paper.offsetHeight * cosine * scale) / 2 - paper.offsetTop,
    yPercent: 0,
    rotation: -3,
    scale,
  };
}

export function createDocumentTimeline(paper: HTMLElement) {
  const folder = paper.parentElement!;
  const pocketTransform = measurePocketTransform(paper, folder);
  const centeredOffsetX = folder.offsetWidth / 2 - paper.offsetLeft - paper.offsetWidth / 2;
  const styles = getComputedStyle(paper);
  const headerBottom =
    folder.closest('.home-frame')?.querySelector('.home-header')?.getBoundingClientRect().bottom ??
    65;
  const clearanceOffset = Math.max(
    folder.offsetHeight * 0.24 - paper.offsetTop - 12,
    headerBottom + 12 - folder.getBoundingClientRect().top - paper.offsetTop + paper.offsetHeight,
  );
  const frontOffset = Number.parseFloat(styles.getPropertyValue('--document-front-offset')) || -25;
  const frontRotation =
    Number.parseFloat(styles.getPropertyValue('--document-front-rotation')) || 0;
  const frontScale = Number.parseFloat(styles.getPropertyValue('--document-front-scale')) || 1;

  // At time zero GSAP reverts timeline sets, so the fitted pocket state must exist beforehand.

  gsap.set(paper, {
    zIndex: 2,
    ...pocketTransform,
  });

  // Reversing this same timeline also reverses the layer change at the pocket mouth.

  return gsap
    .timeline({ paused: true })
    .set(paper, { zIndex: 2 })
    .fromTo(paper, pocketTransform, {
      x: centeredOffsetX,
      yPercent: -100,
      y: clearanceOffset,
      rotation: 0,
      scale: 1,
      duration: 0.28,
      ease: 'power2.inOut',
      immediateRender: false,
    })
    .set(paper, { zIndex: 6 })
    .to(paper, {
      // Whole-pixel resting coordinates avoid fractional translation of the text.

      yPercent: 0,
      y: Math.round((paper.offsetHeight * frontOffset) / 100),
      rotation: frontRotation,
      scale: frontScale,
      // Keep the resting sheet in 2D so text is not left on a forced GPU texture.

      force3D: false,
      duration: 0.34,
      ease: 'power2.inOut',
    });
}

export function useFolderDocumentMotion({ isOpen, onMotionChange }: FolderDocumentMotionOptions) {
  const documentElement = useRef<HTMLElement>(null);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const openState = useRef(isOpen);
  const motionCallback = useRef(onMotionChange);
  openState.current = isOpen;
  motionCallback.current = onMotionChange;

  function notifyMotionState(moving: boolean, open: boolean) {
    const paper = documentElement.current;
    if (paper) {
      paper.dataset.motionState = moving
        ? open
          ? 'opening'
          : 'closing'
        : open
          ? 'open'
          : 'closed';
      if (!moving) paper.dispatchEvent(new Event('document-motion-settled'));
    }
    motionCallback.current(moving);
  }

  useLayoutEffect(() => {
    const paper = documentElement.current;
    if (!paper) return;

    function rebuildAnimation() {
      if (!paper) return;
      const progress = animation.current?.progress() ?? 0;
      animation.current?.kill();
      const timeline = createDocumentTimeline(paper);
      timeline.timeScale(
        Number.parseFloat(getComputedStyle(paper).getPropertyValue('--document-playback-rate')) ||
          1,
      );
      animation.current = timeline;
      timeline.eventCallback('onComplete', () => notifyMotionState(false, true));
      timeline.eventCallback('onReverseComplete', () => notifyMotionState(false, false));
      timeline.progress(progress).pause();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timeline.progress(openState.current ? 1 : 0);
        notifyMotionState(false, openState.current);
      } else if (openState.current) {
        notifyMotionState(progress < 1, true);
        timeline.play();
      } else {
        notifyMotionState(progress > 0, false);
        timeline.reverse();
      }
    }

    rebuildAnimation();
    const stopObserving = observeReducedMotion(() => {
      animation.current?.pause().progress(openState.current ? 1 : 0);
      notifyMotionState(false, openState.current);
    });
    const resizeObserver = new ResizeObserver(rebuildAnimation);
    window.addEventListener('resize', rebuildAnimation);
    paper.parentElement?.addEventListener('folder-layout-settled', rebuildAnimation);
    resizeObserver.observe(paper);
    if (paper.parentElement) resizeObserver.observe(paper.parentElement);
    return () => {
      stopObserving();
      window.removeEventListener('resize', rebuildAnimation);
      paper.parentElement?.removeEventListener('folder-layout-settled', rebuildAnimation);
      resizeObserver.disconnect();
      animation.current?.kill();
      animation.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const timeline = animation.current;
    if (!timeline) return;
    const paper = documentElement.current;
    if (paper)
      timeline.timeScale(
        Number.parseFloat(getComputedStyle(paper).getPropertyValue('--document-playback-rate')) ||
          1,
      );
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timeline.pause().progress(isOpen ? 1 : 0);
      notifyMotionState(false, isOpen);
      return;
    }
    notifyMotionState(isOpen ? timeline.progress() < 1 : timeline.progress() > 0, isOpen);
    if (isOpen) timeline.play();
    else timeline.reverse();
  }, [isOpen]);

  return documentElement;
}
