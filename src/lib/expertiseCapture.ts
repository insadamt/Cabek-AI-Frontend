/** Expertise capture policy and destinations for imported dossiers.
 * Depends on saved workflow DTOs; the backend remains authoritative for admission.
 */
import type { DossierResponse, DossierSummary } from '../types';

export function canCaptureExpertise(dossier: DossierSummary | DossierResponse) {
  const photoCount = 'photos' in dossier ? dossier.photos.length : dossier.photo_count;
  return (
    (dossier.type ?? 'forfait_expertise') === 'forfait_expertise' &&
    ['not_analyzed', 'failed'].includes(dossier.status) &&
    (photoCount === 0 ||
      ['awaiting_photos', 'capture_failed', 'capturing'].includes(dossier.workflow_status ?? ''))
  );
}

export function expertiseTunnelPath(dossierId?: string) {
  return (
    '/?parcours=forfait-expertise&scene=1' +
    (dossierId ? `&dossier=${encodeURIComponent(dossierId)}` : '')
  );
}
