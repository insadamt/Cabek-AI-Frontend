import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animateElement, motionTiming } from '../lib/motion';

export function AnimatedPresence({ visible, children }: { visible: boolean; children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(visible);
  const retainedContent = useRef(children);
  const interruptedHeight = useRef<number | undefined>(undefined);

  // Preserve the last message while it leaves, then remove its inaccessible controls with it.

  if (visible) retainedContent.current = children;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (visible) setPresent(true);
    const fullHeight = element.getBoundingClientRect().height;
    const animation = animateElement(
      element,
      [
        {
          height: `${interruptedHeight.current ?? (visible ? 0 : fullHeight)}px`,
          opacity: visible ? 0 : 1,
          overflow: 'clip',
        },
        { height: `${visible ? fullHeight : 0}px`, opacity: visible ? 1 : 0, overflow: 'clip' },
      ],
      { duration: motionTiming.disclosure },
    );
    interruptedHeight.current = undefined;
    if (!visible) {
      if (animation)
        void animation.finished.then(
          () => setPresent(false),
          () => {},
        );
      else setPresent(false);
    }
    return () => {
      if (animation?.playState === 'running')
        interruptedHeight.current = element.getBoundingClientRect().height;
      animation?.cancel();
    };
  }, [visible]);

  if (!visible && !present) return null;
  return (
    <div
      ref={elementRef}
      className="motion-presence"
      aria-hidden={!visible || undefined}
      inert={!visible}
    >
      {visible ? children : retainedContent.current}
    </div>
  );
}
