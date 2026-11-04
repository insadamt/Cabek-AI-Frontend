/** Resume or permanently delete a local folder; depends on backend admission and the recoverable tunnel store. */
import { useRef, useState } from 'react';
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
import '../../styles/dossier-actions.css';

interface DossierActionsProps {
  dossier: DossierSummary | DossierResponse;
  disabled?: boolean;
  onDeleted?: () => void;
  onError?: () => void;
}

export function DossierActions({
  dossier,
  disabled = false,
  onDeleted,
  onError,
}: DossierActionsProps) {
  const { store, session } = useTunnelCapture();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  if (!isLocalDossier(dossier) || isPreview) return null;
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
      {canResumeCapture(dossier) && (
        <button
          type="button"
          className="text-link"
          disabled={disabled || pending || !!session?.pending || !!session?.saving}
          onClick={() => void run(resume)}
        >
          Reprendre au tunnel
        </button>
      )}
      <button
        type="button"
        className="text-link dossier-delete"
        disabled={disabled || pending || busy || !!session?.pending || !!session?.saving}
        title={busy ? 'Attendez la fin de la capture et de l’analyse.' : undefined}
        onClick={() => void run(remove)}
      >
        {pending ? 'Connexion…' : 'Supprimer'}
      </button>
      {busy && (
        <p className="workflow-note">Suppression disponible après la capture et l’analyse.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
