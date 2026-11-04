/** Keeps deletion behind a compact disclosure; depends on native popovers and shared app controls. */
import { useEffect, useId, useRef } from 'react';
import { EllipsisVertical, Trash2 } from 'lucide-react';

interface DossierDeleteMenuProps {
  disabled: boolean;
  busy: boolean;
  pending: boolean;
  onDelete: () => void;
}

export function DossierDeleteMenu({ disabled, busy, pending, onDelete }: DossierDeleteMenuProps) {
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dismiss = () => popoverRef.current?.hidePopover();
    // Dismiss on layout changes so the menu cannot drift away from its dossier.

    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, []);

  useEffect(() => {
    if (disabled) popoverRef.current?.hidePopover();
  }, [disabled]);

  function positionPopover() {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const bounds = trigger.getBoundingClientRect();
    const menuWidth = Math.min(192, window.innerWidth - 16);
    popover.style.width = `${menuWidth}px`;
    popover.style.left = `${Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8))}px`;
    // Opening upward keeps carousel controls near the viewport bottom usable.

    popover.style.top = bounds.top < 80 ? `${bounds.bottom + 8}px` : 'auto';
    popover.style.bottom = bounds.top < 80 ? 'auto' : `${window.innerHeight - bounds.top + 8}px`;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button dossier-menu-trigger"
        aria-label="Actions du dossier"
        popoverTarget={popoverId}
        disabled={disabled}
        onClick={positionPopover}
      >
        <EllipsisVertical size={20} aria-hidden="true" />
      </button>
      <div ref={popoverRef} id={popoverId} popover="auto" className="dossier-delete-popover">
        <button
          type="button"
          className="dossier-delete"
          disabled={disabled || busy}
          title={busy ? 'Attendez la fin de la capture et de l’analyse.' : undefined}
          onClick={() => {
            popoverRef.current?.hidePopover();
            triggerRef.current?.focus({ preventScroll: true });
            onDelete();
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
          {pending ? 'Connexion…' : 'Supprimer'}
        </button>
      </div>
    </>
  );
}
