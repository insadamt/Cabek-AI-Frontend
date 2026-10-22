import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';

export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const animation = useRef<gsap.core.Tween | null>(null);
  const closing = useRef(false);
  const closeCallback = useRef(onClose);
  const headingId = useId();
  closeCallback.current = onClose;

  function requestClose() {
    if (closing.current || !dialog.current) return;
    closing.current = true;
    animation.current?.kill();
    dialog.current.classList.add('is-closing');
    if (prefersReducedMotion()) {
      closeCallback.current();
      return;
    }

    // Keep the native dialog and its focus trap mounted until both surfaces have left.

    animation.current = gsap.to(dialog.current, {
      opacity: 0,
      y: 6,
      scale: 0.99,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => closeCallback.current(),
    });
  }

  useLayoutEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    element.classList.remove('is-closing');
    closing.current = false;
    if (!prefersReducedMotion()) {
      animation.current = gsap.fromTo(
        element,
        { opacity: 0, y: 10, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.24,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
      );
    }
    const stopObserving = observeReducedMotion(() => animation.current?.progress(1));
    return () => {
      stopObserving();
      animation.current?.kill();
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="modal-header">
        <h2 id={headingId}>{title}</h2>
        <button className="icon-button" onClick={requestClose} aria-label="Fermer la fenêtre">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
