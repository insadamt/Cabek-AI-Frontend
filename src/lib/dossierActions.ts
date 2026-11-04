/** Local folder action policy; depends on saved workflow/scan states, with backend admission as final authority. */
import type { DossierResponse, DossierSummary } from '../types';

type Folder = Pick<DossierSummary, 'type' | 'source' | 'status' | 'workflow_status'>;

export function isLocalDossier(folder: Folder) {
  return (
    folder.source === 'cabek_ai' &&
    (folder.type === 'chiffrage_rapide' || folder.type === 'verification')
  );
}

export function isDossierBusy(folder: Folder) {
  return folder.workflow_status === 'capturing' || ['queued', 'processing'].includes(folder.status);
}

export function canResumeCapture(folder: Folder) {
  return (
    isLocalDossier(folder) &&
    folder.status !== 'completed' &&
    folder.workflow_status !== 'comparison_ready'
  );
}

export function capturePhaseForDossier(folder: DossierResponse) {
  if (folder.type !== 'verification') return undefined;
  return folder.workflow_status === 'awaiting_after' || folder.comparison?.before_locked
    ? 'after'
    : 'before';
}
