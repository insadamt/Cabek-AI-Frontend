/**
 * Separates durable capture recovery from the island's route-aware activity presentation.
 * Depends on confirmed capture/dossier states and category URLs; stored identity alone never expands the island.
 */
import type { CaptureSession } from '../captureTypes';
import { categoryForType, categoryPath } from './workflows';
import { captureReady } from './tunnelCapture';
import { expertiseCaptureNeedsRestart } from './expertiseCapture';

export function getCapturePresentation(session: CaptureSession | null, location: string) {
  if (!session) return null;
  const url = new URL(location, 'https://cabek.local');
  const category = categoryForType(session.identity.type);
  const onTunnel =
    (url.pathname === '/' &&
      (url.searchParams.get('reprendre') === '1' ||
        (url.searchParams.get('scene') === '1' &&
          url.searchParams.get('parcours') === category.slug))) ||
    url.pathname === `${categoryPath(session.identity.type)}/new`;
  const failed = !!(
    session.error ||
    session.capture?.error_code ||
    session.capture?.analysis_error ||
    session.response?.status === 'failed'
  );
  if (failed) return onTunnel ? 'recovery' : null;
  if (session.pending || session.capture?.status === 'capturing') return 'capture';
  if (session.response?.status === 'processing' || session.response?.status === 'queued')
    return 'analysis';
  if (expertiseCaptureNeedsRestart(session)) return null;
  if (onTunnel && session.identity.dossierId) {
    if (!session.synchronized) return 'recovery';
    if (session.capture?.status === 'completed')
      return captureReady(session) ? 'complete' : 'metadata';
  }
  return null;
}
