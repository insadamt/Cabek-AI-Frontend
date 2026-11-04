/** Adapts confirmed tunnel AI work to the carousel island presentation; depends on saved backend progress and shared analysis DTOs. */
import type { HomeAnalysisSession } from '../hooks/useHomeAnalysis';
import type { CaptureSession } from '../captureTypes';
import { failureMessage } from './errors';

export function captureAnalysisSession(capture: CaptureSession | null): HomeAnalysisSession | null {
  const response = capture?.response;
  if (
    !capture ||
    capture.identity.type !== 'chiffrage_rapide' ||
    capture.capture?.status !== 'completed' ||
    !response ||
    !['queued', 'processing', 'completed', 'failed'].includes(response.status)
  )
    return null;
  const code =
    response.error?.code ?? (response.status === 'failed' ? capture.capture.analysis_error : null);
  const error = capture.error || (code ? failureMessage(code) : '');
  return {
    dossier: {
      dossier_id: response.dossier_id,
      type: response.type,
      source: response.source,
      vehicle: response.vehicle,
      status: response.status,
      workflow_status: response.workflow_status,
      photo_count: response.photos.length,
      created_at: response.created_at ?? null,
    },
    response,
    error,
    phase:
      error || response.status === 'failed'
        ? 'error'
        : response.status === 'completed'
          ? 'done'
          : 'working',
    receivedAt: capture.receivedAt ?? performance.now(),
    startedAt: capture.startedAt ?? 0,
  };
}
