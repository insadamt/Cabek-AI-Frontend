/** Verifies capture completion independently from genuine AI/pricing completion; depends on authoritative capture and original-photo DTOs. */
import { describe, expect, it } from 'vitest';
import { capturePhotosReady, captureReady } from './tunnelCapture';
import type { CaptureSession } from '../captureTypes';

function savedCapture(): CaptureSession {
  const photo = {
    photo_id: 'real-photo',
    phase: null,
    original_url: '/api/original.jpg',
    status: 'saved' as const,
  };
  return {
    identity: { type: 'chiffrage_rapide', creationKey: 'stable', dossierId: 'SAVED-1' },
    synchronized: true,
    pending: false,
    error: '',
    capture: {
      dossier_id: 'SAVED-1',
      phase: null,
      capture_id: 'CAMERA-1',
      status: 'completed',
      saved_count: 1,
      expected_count: 1,
      photos: [photo],
      error_code: null,
      analysis_error: null,
    },
    response: {
      dossier_id: 'SAVED-1',
      type: 'chiffrage_rapide',
      status: 'processing',
      workflow_status: 'awaiting_metadata',
      vehicle: { marque: '', modele: '', matricule: '' },
      photos: [photo],
      progress: null,
      error: null,
      result: null,
    },
  };
}

describe('photo capture completion', () => {
  it('keeps originals ready but blocks dossier opening while AI and pricing are pending', () => {
    const session = savedCapture();
    expect(capturePhotosReady(session)).toBe(true);
    expect(captureReady(session)).toBe(false);
    expect(session.response?.result).toBeNull();
  });
  it('keeps captured photos available if real AI admission or inference fails', () => {
    const session = savedCapture();
    session.capture!.analysis_error = 'worker_unavailable';
    session.response!.status = 'failed';
    session.response!.error = { code: 'scan_failed', message: 'Failed' };
    expect(capturePhotosReady(session)).toBe(true);
    expect(captureReady(session)).toBe(false);
  });
  it('requires every declared capture photo to exist in the dossier response', () => {
    const session = savedCapture();
    session.response!.photos = [];
    expect(capturePhotosReady(session)).toBe(false);
    session.response!.photos = [...session.capture!.photos];
    session.capture!.expected_count = 2;
    expect(capturePhotosReady(session)).toBe(false);
  });
  it('does not open failed, active, unsynchronized, empty or mismatched captures', () => {
    const original = savedCapture();
    expect(capturePhotosReady(null)).toBe(false);
    expect(capturePhotosReady({ ...original, pending: true })).toBe(false);
    expect(capturePhotosReady({ ...original, saving: true })).toBe(false);
    expect(capturePhotosReady({ ...original, synchronized: false })).toBe(false);
    for (const status of ['failed', 'capturing', 'not_started'] as const) {
      expect(capturePhotosReady({ ...original, capture: { ...original.capture!, status } })).toBe(
        false,
      );
    }
    expect(
      capturePhotosReady({
        ...original,
        capture: { ...original.capture!, photos: [], expected_count: 0, saved_count: 0 },
      }),
    ).toBe(false);
    original.response!.dossier_id = 'OTHER';
    expect(capturePhotosReady(original)).toBe(false);
  });
});
