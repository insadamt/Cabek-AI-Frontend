import gsap from 'gsap';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface DragOrigin {
  pointerId: number;
  x: number;
  pointerStartX: number;
  interruptedMotion: boolean;
  y: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  spacing: number;
}

export function useDossierCarousel(
  onStep: (direction: number) => void,
  enabled = true,
  onMotionTap?: (steps: number, event: PointerEvent<HTMLElement>) => void,
) {
  const dragOrigin = useRef<DragOrigin | null>(null);
  const suppressSelection = useRef(false);
  const motion = useRef({ progress: 0 });
  const animation = useRef<gsap.core.Tween | null>(null);
  const targetProgress = useRef(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(
    () => () => {
      animation.current?.kill();
    },
    [],
  );

  function settleGesture(steps: number) {
    dragOrigin.current = null;
    setDragging(false);
    animation.current?.kill();
    targetProgress.current = steps;
    setAnimating(true);
    animation.current = gsap.to(motion.current, {
      progress: steps,
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.42,
      ease: 'power3.out',
      onUpdate: () => setProgress(motion.current.progress),
      onComplete: () => {
        motion.current.progress = 0;
        targetProgress.current = 0;
        setAnimating(false);
        setProgress(0);
        if (steps) onStep(steps);
      },
    });
    setTilt({ x: 0, y: 0 });
  }

  function stopMotion() {
    animation.current?.kill();
    animation.current = null;
    dragOrigin.current = null;
    motion.current.progress = 0;
    targetProgress.current = 0;
    setProgress(0);
    setDragging(false);
    setAnimating(false);
    setTilt({ x: 0, y: 0 });
  }

  function animateStep(direction: number) {
    if (!enabled) return;

    // Retarget the running track so repeated arrow clicks keep their accumulated distance.

    settleGesture(targetProgress.current + direction);
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    const interruptedMotion =
      animation.current?.isActive() === true || motion.current.progress !== 0;
    animation.current?.kill();
    suppressSelection.current = false;
    setAnimating(false);
    targetProgress.current = 0;
    const spacingRatio =
      Number.parseFloat(
        getComputedStyle(event.currentTarget).getPropertyValue('--carousel-spacing-ratio'),
      ) || 0.34;
    const spacing = event.currentTarget.getBoundingClientRect().width * spacingRatio;
    dragOrigin.current = {
      pointerId: event.pointerId,
      x: event.clientX + motion.current.progress * spacing,
      pointerStartX: event.clientX,
      interruptedMotion,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      spacing,
    };
  }

  function movePointer(event: PointerEvent<HTMLElement>) {
    const origin = dragOrigin.current;
    if (origin) {
      const distance = event.clientX - origin.x;
      const pointerDistance = event.clientX - origin.pointerStartX;

      // Leave vertical gestures to the page until horizontal intent is established.

      if (
        !suppressSelection.current &&
        Math.abs(event.clientY - origin.y) > Math.abs(pointerDistance) &&
        Math.abs(pointerDistance) < 12
      ) {
        // Native vertical scrolling must not start a settling animation or dismiss the paper.

        if (motion.current.progress === 0) dragOrigin.current = null;
        else settleGesture(Math.round(motion.current.progress));
        return;
      }
      if (Math.abs(pointerDistance) > 6 || suppressSelection.current) {
        event.currentTarget.setPointerCapture(event.pointerId);
        suppressSelection.current = true;
        setDragging(true);
        const elapsed = Math.max(1, event.timeStamp - origin.lastTime);
        origin.velocity = (event.clientX - origin.lastX) / elapsed;
        origin.lastX = event.clientX;
        origin.lastTime = event.timeStamp;
        motion.current.progress = -distance / origin.spacing;
        setProgress(motion.current.progress);
      }
      return;
    }
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -7,
      y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 9,
    });
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    // A plain click must reach the folder without starting a zero-distance settling animation.

    if (!suppressSelection.current) {
      if (origin.interruptedMotion) {
        const nearestSteps = Math.round(motion.current.progress);
        stopMotion();

        // Consume the following click so it cannot activate the old folder after this tap.

        suppressSelection.current = true;
        if (nearestSteps) onStep(nearestSteps);
        onMotionTap?.(nearestSteps, event);
      } else {
        dragOrigin.current = null;
      }
      return;
    }
    const velocity = event.timeStamp - origin.lastTime < 80 ? origin.velocity : 0;
    const projectedProgress =
      motion.current.progress - Math.max(-0.65, Math.min(0.65, (velocity * 130) / origin.spacing));
    let steps = Math.round(projectedProgress);
    if (!steps && Math.abs(event.clientX - origin.x) > 45)
      steps = Math.sign(motion.current.progress);
    settleGesture(suppressSelection.current ? steps : 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return {
    progress,
    dragging,
    animating,
    animateStep,
    stopMotion,
    tilt,
    canSelect: () => !suppressSelection.current,
    gestureHandlers: {
      onPointerDown: startDrag,
      onPointerMove: movePointer,
      onPointerUp: finishDrag,
      onPointerCancel: () => {
        if (dragOrigin.current) settleGesture(0);
      },
      onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
        if (event.target === event.currentTarget && dragOrigin.current) settleGesture(0);
      },
      onPointerLeave: () => {
        if (!dragOrigin.current) setTilt({ x: 0, y: 0 });
      },
    },
  };
}
