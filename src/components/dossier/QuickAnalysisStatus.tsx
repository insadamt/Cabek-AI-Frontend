/** Separates received originals, real detection progress and pricing prerequisites; depends on saved API status and progress. */
import type { DossierResponse } from '../../types';
import { failureMessage } from '../../lib/api';
import { hasVehicleMetadata } from '../../lib/tunnelCapture';

export function QuickAnalysisStatus({ response }: { response: DossierResponse }) {
  const progress = response.progress;
  const labels = {
    queued: 'Analyse IA en attente',
    preparing: 'Préparation de l’analyse IA',
    analyzing_photos: 'Analyse IA des photographies',
    awaiting_metadata: 'Détection terminée · chiffrage en attente de la fiche véhicule',
    finalizing: 'Chiffrage et rapport en cours',
    completed: 'Analyse terminée',
    failed: 'Analyse interrompue · photographies conservées',
  };
  const label =
    response.status === 'failed'
      ? labels.failed
      : response.status === 'completed'
        ? labels.completed
        : progress
          ? labels[progress.stage]
          : 'Photographies enregistrées';
  return (
    <div className="quick-analysis-status">
      <p role="status" aria-live="polite">
        {label}
        {' · '}
        {response.photos.length} photos enregistrées
        {response.status !== 'completed' &&
          progress &&
          progress.photos_total > 0 &&
          ` · ${progress.photos_completed}/${progress.photos_total} photos analysées`}
      </p>
      {!hasVehicleMetadata(response) && response.status !== 'completed' && (
        <p className="workflow-note">
          Les photographies restent consultables. Complétez la fiche véhicule pour permettre le
          chiffrage.
        </p>
      )}
      {response.error && <p role="alert">{failureMessage(response.error.code)}</p>}
    </div>
  );
}
