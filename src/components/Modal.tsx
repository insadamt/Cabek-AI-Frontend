import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';

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
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    let animation: gsap.core.Tween | undefined;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation = gsap.fromTo(
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
    return () => {
      animation?.kill();
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-labelledby="modal-heading"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="modal-heading">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fermer la fenêtre">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
