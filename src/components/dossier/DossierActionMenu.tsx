/** Groups secondary dossier actions behind a compact disclosure; depends on native popovers and shared app controls. */
import { useEffect, useId, useRef } from 'react';
import { Camera, EllipsisVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';

interface DossierActionMenuProps {
  disabled: boolean;
  busy: boolean;
  pending: boolean;
  onDelete?: () => void;
  onNewBefore?: () => void;
  onCompleteAfter?: () => void;
  onResume?: () => void;
}

export function DossierActionMenu({
  disabled,
  busy,
  pending,
  onDelete,
  onResume,
  onNewBefore,
  onCompleteAfter,
}: DossierActionMenuProps) {
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      popoverRef.current?.hidePopover();
    };
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
    const menuWidth = Math.min(240, window.innerWidth - 16);
    popover.style.width = `${menuWidth}px`;
    popover.style.left = `${Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8))}px`;
    // Prefer upward opening near carousel controls and use the larger space on short screens.

    const spaceAbove = bounds.top - 16;
    const spaceBelow = window.innerHeight - bounds.bottom - 16;
    const openAbove = spaceAbove >= 180 || spaceAbove > spaceBelow;
    popover.style.maxHeight = `${Math.max(0, openAbove ? spaceAbove : spaceBelow)}px`;
    popover.style.top = openAbove ? 'auto' : `${bounds.bottom + 8}px`;
    popover.style.bottom = openAbove ? `${window.innerHeight - bounds.top + 8}px` : 'auto';
  }

  function activateAction(action: () => void) {
    popoverRef.current?.hidePopover();
    triggerRef.current?.focus({ preventScroll: true });
    action();
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
      <div ref={popoverRef} id={popoverId} popover="auto" className="dossier-action-popover">
        {onNewBefore && (
          <button
            type="button"
            className="dossier-menu-item"
            disabled={disabled}
            onClick={() => activateAction(onNewBefore)}
          >
            <Plus size={16} aria-hidden="true" />
            Nouvelle capture AVANT
          </button>
        )}
        {onCompleteAfter && (
          <button
            type="button"
            className="dossier-menu-item"
            disabled={disabled}
            onClick={() => activateAction(onCompleteAfter)}
          >
            <Camera size={16} aria-hidden="true" />
            Compléter une capture APRÈS
          </button>
        )}
        {onResume && (
          <button
            type="button"
            className="dossier-menu-item"
            disabled={disabled}
            onClick={() => activateAction(onResume)}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reprendre au tunnel
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="dossier-menu-item dossier-delete"
            disabled={disabled || busy}
            title={busy ? 'Attendez la fin de la capture et de l’analyse.' : undefined}
            onClick={() => activateAction(onDelete)}
          >
            <Trash2 size={16} aria-hidden="true" />
            {pending ? 'Connexion…' : 'Supprimer'}
          </button>
        )}
        {onDelete && busy && (
          <p className="dossier-menu-note">Suppression disponible après la capture et l’analyse.</p>
        )}
      </div>
    </>
  );
}
