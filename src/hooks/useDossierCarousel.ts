import { useRef, useState, type PointerEvent } from 'react';

interface DragOrigin {
  pointerId: number;
  x: number;
  y: number;
}

export function useDossierCarousel(onStep: (direction: number) => void) {
  const dragOrigin = useRef<DragOrigin | null>(null);
  const suppressSelection = useRef(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function resetGesture() {
    dragOrigin.current = null;
    setDragDistance(0);
    setTilt({ x: 0, y: 0 });
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressSelection.current = false;
    dragOrigin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function movePointer(event: PointerEvent<HTMLElement>) {
    const origin = dragOrigin.current;
    if (origin) {
      const distance = event.clientX - origin.x;

      // Capture only a horizontal gesture so touch users can still scroll the page vertically.

      if (Math.abs(event.clientY - origin.y) > Math.abs(distance) && Math.abs(distance) < 12) {
        resetGesture();
        return;
      }
      if (Math.abs(distance) > 8) {
        event.currentTarget.setPointerCapture(event.pointerId);
        suppressSelection.current = true;
        setDragDistance(Math.max(-140, Math.min(140, distance)));
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
    if (!origin) return;
    const distance = event.clientX - origin.x;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (suppressSelection.current && Math.abs(distance) > 45) onStep(distance < 0 ? 1 : -1);
    resetGesture();
  }

  return {
    dragDistance,
    tilt,
    canSelect: () => !suppressSelection.current,
    gestureHandlers: {
      onPointerDown: startDrag,
      onPointerMove: movePointer,
      onPointerUp: finishDrag,
      onPointerCancel: resetGesture,
      onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
        // Touch transfers its implicit capture from a folder to the stage during a drag.

        if (event.target === event.currentTarget) resetGesture();
      },
      onPointerLeave: () => {
        if (!dragOrigin.current) setTilt({ x: 0, y: 0 });
      },
    },
  };
}
