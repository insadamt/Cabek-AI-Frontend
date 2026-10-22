import { Check, LoaderCircle, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { RefObject } from 'react';
import type { DossierOpeningPhase, DossierOpeningSession } from '../../lib/dossierOpeningState';

const phaseLabels: Record<DossierOpeningPhase, string> = {
  extracting: 'Ouverture du dossier',
  ingesting: 'Lecture du document',
  loading: 'Chargement des images',
  returning: 'Images prêtes',
  stowing: 'Ouverture des détails',
  error: 'Chargement interrompu',
};

export function getDossierOpeningLabel(session: DossierOpeningSession) {
  return session.error && session.phase !== 'error'
    ? 'Retour du document'
    : phaseLabels[session.phase];
}

export function DossierOpeningActivity({
  session,
  contentRef,
}: {
  session: DossierOpeningSession;
  contentRef?: RefObject<HTMLDivElement | null>;
}) {
  const failed = session.phase === 'error';
  const label = getDossierOpeningLabel(session);
  const success = !session.error && ['returning', 'stowing'].includes(session.phase);
  const percentage = session.total ? (session.loaded / session.total) * 100 : undefined;
  return (
    <div ref={contentRef} className="island-activity">
      <span className="island-pixels" aria-hidden="true">
        {session.error ? (
          <TriangleAlert size={18} />
        ) : success ? (
          <Check size={18} />
        ) : (
          <LoaderCircle size={18} className="spin" />
        )}
      </span>
      <span
        className="island-status"
        role="status"
        aria-live="polite"
        title={session.error || label}
      >
        {label}
      </span>
      {!failed && (
        <span
          className="island-timer"
          aria-label={`${session.loaded} images chargées sur ${session.total}`}
        >
          {session.total ? `${session.loaded}/${session.total}` : '…'}
        </span>
      )}
      {failed && (
        <button
          className="island-error-link"
          onClick={session.retry}
          aria-label="Réessayer le chargement des images"
          title="Réessayer"
        >
          <RotateCcw size={14} />
        </button>
      )}
      <button
        className="island-error-link"
        onClick={session.cancel}
        aria-label="Annuler l’ouverture du dossier"
        title="Annuler"
      >
        <X size={14} />
      </button>
      {!failed && (
        <div
          className="island-progress"
          role="progressbar"
          aria-label="Images chargées"
          aria-valuemin={0}
          aria-valuemax={session.total || undefined}
          aria-valuenow={session.total ? session.loaded : undefined}
        >
          <span
            style={{ width: percentage == null ? '24%' : `${percentage}%` }}
            className={percentage == null ? 'is-indeterminate' : ''}
          />
        </div>
      )}
    </div>
  );
}
