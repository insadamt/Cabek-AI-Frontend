/** Derive studio lighting from confirmed workflow completion, keeping photo delivery and AI completion independent.
 * Depends on the capture session and BayCaptureLight DTO; restored completed dossiers have no fresh success hold. */
import type { CaptureSession } from '../captureTypes';
import type { BayCaptureLight } from '../components/scanner/bayCaptureLight';
import { expertiseCaptureNeedsRestart } from './expertiseCapture';

export function getCaptureLight(session: CaptureSession | null): BayCaptureLight {
  const capture = session?.capture;
  if (!session || !capture || expertiseCaptureNeedsRestart(session))
    return { status: 'not_started' };
  if (!capture.slow_mode || session.identity.type === 'verification' || capture.status !== 'completed')
    return { status: capture.status, changedAt: session.captureChangedAt };
  if (session.response?.status === 'failed' || capture.analysis_error) return { status: 'failed' };
  if (session.response?.status === 'completed' && session.response.result)
    return { status: 'completed', changedAt: session.analysisCompletedAt };
  return { status: 'capturing', sweeping: false };
}
