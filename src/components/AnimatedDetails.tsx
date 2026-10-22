import gsap from 'gsap';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

interface AnimatedDetailsProps {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function AnimatedDetails({
  summary,
  children,
  className = '',
  defaultOpen = false,
}: AnimatedDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const animation = useRef<gsap.core.Tween | null>(null);
  const requestedOpen = useRef(defaultOpen);
  const [expanded, setExpanded] = useState(defaultOpen);

  function finishToggle() {
    const details = detailsRef.current;
    if (!details) return;
    animation.current?.kill();
    animation.current = null;
    details.open = requestedOpen.current;
    gsap.set(details, { clearProps: 'height,overflow' });
  }

  function toggle() {
    const details = detailsRef.current;
    if (!details) return;
    const startHeight = details.getBoundingClientRect().height;
    animation.current?.kill();
    requestedOpen.current = !requestedOpen.current;
    setExpanded(requestedOpen.current);
    if (prefersReducedMotion()) {
      finishToggle();
      return;
    }

    // Measure the destination with native details layout, then animate from the interrupted height.

    gsap.set(details, { clearProps: 'height' });
    details.open = requestedOpen.current;
    const endHeight = details.getBoundingClientRect().height;
    details.open = true;
    animation.current = gsap.fromTo(
      details,
      { height: startHeight, overflow: 'hidden' },
      {
        height: endHeight,
        duration: 0.24,
        ease: 'power2.inOut',
        onComplete: finishToggle,
      },
    );
  }

  useEffect(() => {
    const stopObserving = observeReducedMotion(finishToggle);
    window.addEventListener('resize', finishToggle);
    return () => {
      stopObserving();
      window.removeEventListener('resize', finishToggle);
      animation.current?.kill();
    };
  }, []);

  return (
    <details
      ref={detailsRef}
      className={`animated-details ${className}`}
      open={defaultOpen}
      data-expanded={expanded}
    >
      <summary
        aria-expanded={expanded}
        onClick={(event) => {
          event.preventDefault();
          toggle();
        }}
      >
        {summary}
      </summary>
      <div className="details-content" inert={!expanded}>
        {children}
      </div>
    </details>
  );
}
