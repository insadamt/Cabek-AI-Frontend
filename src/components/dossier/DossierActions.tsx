/** Groups secondary local folder actions in a shared menu; depends on backend admission and the recoverable tunnel store. */
import { useRef, useState, type ReactNode } from 'react';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { navigate } from '../../hooks/useNavigation';
import { deleteDossier, describeError, isPreview, readDossier } from '../../lib/api';
import {
  canResumeCapture,
  capturePhaseForDossier,
  isDossierBusy,
  isLocalDossier,
} from '../../lib/dossierActions';
import { categoryPath } from '../../lib/workflows';
import type { DossierResponse, DossierSummary } from '../../types';
import { DossierActionMenu } from './DossierActionMenu';
import '../../styles/dossier-actions.css';

interface DossierActionsProps {
  dossier: DossierSummary | DossierResponse;
  children?: ReactNode;
  disabled?: boolean;
  onDeleted?: () => void;
  onError?: () => void;
}

export function DossierActions({
  dossier,
  children,
  disabled = false,
  onDeleted,
  onError,
}: DossierActionsProps) {
  const { store, session } = useTunnelCapture(dossier.type);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const allowDossierActions = isLocalDossier(dossier) && !isPreview;
  // Session navigation remains available even when dossier mutations are unavailable.

  if (!allowDossierActions && !children) return null;
  const busy =
    isDossierBusy(dossier) ||
    (session?.identity.dossierId === dossier.dossier_id && session.capture?.status === 'capturing');

  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(describeError(failure));
      onError?.();
      window.dispatchEvent(new Event('cabek:dossiers-changed'));
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  function releaseSession() {
    if (store && !store.clear()) throw new Error('Attendez la fin de l’enregistrement en cours.');
  }

  async function resume() {
    if (!store) throw new Error('Le tunnel est indisponible.');
    const saved = await readDossier(dossier.dossier_id);
    if (!canResumeCapture(saved))
      throw new Error('Ce dossier est finalisé. Ouvrez son résultat enregistré.');
    if (
      session &&
      session.identity.dossierId !== saved.dossier_id &&
      !window.confirm(
        'Le dossier actif sera conservé et son traitement continuera. Reprendre ce dossier ?',
      )
    )
      return;
    releaseSession();
    store.restoreExisting(
      saved.type as 'chiffrage_rapide' | 'verification',
      capturePhaseForDossier(saved),
      saved.dossier_id,
    );
    navigate(`${categoryPath(saved.type)}/new`);
  }

  async function remove() {
    if (
      !window.confirm(
        `Supprimer définitivement le dossier ${dossier.dossier_id}, ses photographies et ses résultats ? Cette action est irréversible.`,
      )
    )
      return;
    await deleteDossier(dossier.dossier_id);
    if (session?.identity.dossierId === dossier.dossier_id) releaseSession();
    window.dispatchEvent(new Event('cabek:dossiers-changed'));
    onDeleted?.();
  }

  return (
    <div
      className="dossier-actions"
      aria-busy={pending}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DossierActionMenu
        disabled={disabled || pending || !!session?.pending || !!session?.saving}
        busy={busy}
        pending={pending}
        onDelete={allowDossierActions ? () => void run(remove) : undefined}
        onResume={
          allowDossierActions && canResumeCapture(dossier) ? () => void run(resume) : undefined
        }
      >
        {children}
      </DossierActionMenu>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
