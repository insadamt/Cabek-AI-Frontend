/** Open tunnel capture with the current imported dossier explicitly selected.
 * Depends on saved eligibility and navigation; opening this action never starts capture.
 */
import { Camera } from 'lucide-react';
import { isPreview } from '../../lib/api';
import { canCaptureExpertise, expertiseTunnelPath } from '../../lib/expertiseCapture';
import { navigate } from '../../hooks/useNavigation';
import type { DossierResponse } from '../../types';

export function ExpertiseCaptureAction({ dossier }: { dossier: DossierResponse }) {
  if (!canCaptureExpertise(dossier)) return null;
  return (
    <button
      type="button"
      className="button workflow-primary"
      disabled={isPreview}
      onClick={() => navigate(expertiseTunnelPath(dossier.dossier_id))}
    >
      <Camera size={17} aria-hidden="true" />
      {dossier.workflow_status === 'capturing' ? 'Suivre la capture' : 'Scanner via le tunnel'}
    </button>
  );
}
