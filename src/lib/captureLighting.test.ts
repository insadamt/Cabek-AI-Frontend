/** Verify success colors require AI output while verification remains capture-driven.
 * Depends on session DTO adapters; no renderer or hardware is needed. */
import { expect, it } from 'vitest';
import type { CaptureSession } from '../captureTypes';
import { getCaptureLight } from './captureLighting';

function session(status = 'processing', type = 'chiffrage_rapide') {
  return {
    identity: { type },
    capture: { status: 'completed', analysis_error: null, slow_mode: true },
    response: { status, result: null },
    captureChangedAt: 1000,
    analysisCompletedAt: 9000,
  } as unknown as CaptureSession;
}

it('keeps red through queue, inference, metadata waiting and publication without saved results', () => {
  for (const status of ['not_analyzed', 'queued', 'processing', 'completed'])
    expect(getCaptureLight(session(status)).status).toBe('capturing');
});
it('uses the AI completion timestamp for a saved result and amber for AI failure', () => {
  const completed = session('completed');
  completed.response!.result = {} as NonNullable<CaptureSession['response']>['result'];
  expect(getCaptureLight(completed)).toEqual({ status: 'completed', changedAt: 9000 });
  expect(getCaptureLight(session('failed')).status).toBe('failed');
  const rejected = session();
  rejected.capture!.analysis_error = 'worker_unavailable';
  expect(getCaptureLight(rejected).status).toBe('failed');
});
it('allows verification success after capture because that workflow does not run AI', () => {
  expect(getCaptureLight(session('not_analyzed', 'verification'))).toEqual({
    status: 'completed',
    changedAt: 1000,
  });
});

// The default capture gate must ignore later AI transitions, including failures.
it('completes normal mode at photo completion and ignores subsequent AI callbacks', () => {
  for (const state of ['not_analyzed', 'queued', 'processing', 'completed', 'failed']) {
    const normal = session(state);
    normal.capture!.slow_mode = false;
    expect(getCaptureLight(normal)).toEqual({ status: 'completed', changedAt: 1000 });
  }
});
