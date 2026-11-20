/**
 * Provides the accessible drawer shell, scrolling body and animated close lifecycle.
 * Depends on the native dialog and openDetailsDrawer; optional styling stays scoped to each editor.
 */
import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { openDetailsDrawer } from '../../lib/detailsDrawerMotion';

interface DetailsDrawerProps {
  title: string;
  subtitle: string;
  className?: string;
  closeLabel?: string;
  onClose: () => void;
  children: (requestClose: (afterClose?: () => void) => void) => ReactNode;
}

export function DetailsDrawer({
  title,
  subtitle,
  className,
  closeLabel = 'Fermer les détails',
  onClose,
  children,
}: DetailsDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<ReturnType<typeof openDetailsDrawer> | null>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const headingId = useId();

  useLayoutEffect(() => {
    const lifecycle = openDetailsDrawer(dialog.current!, () => closeCallback.current());
    controller.current = lifecycle;
    return () => {
      lifecycle.dispose();
      controller.current = null;
    };
  }, []);

  function requestClose(afterClose?: () => void) {
    controller.current?.requestClose(afterClose);
  }

  return (
    <dialog
      ref={dialog}
      className={`details-drawer${className ? ` ${className}` : ''}`}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          requestClose();
      }}
    >
      <header className="details-drawer-header">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h2 id={headingId}>{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          autoFocus
          onClick={() => requestClose()}
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      </header>
      <div className="details-drawer-content">{children(requestClose)}</div>
    </dialog>
  );
}
