/** Regress the empty imported-dossier snapshot across the real store, island and 3D presentation.
 * Depends on controlled API reads and the CPU light sampler; no browser or scanner hardware is used. */
import { expect, it, vi } from 'vitest';
import type { CaptureSession } from '../captureTypes';
import { captureLabel, createTunnelCaptureStore } from './tunnelCapture';
import { getCapturePresentation } from './capturePresentation';
import { getCaptureLight } from './captureLighting';
import { expertiseCaptureNeedsRestart } from './expertiseCapture';
import { createCapturePresentation } from '../components/scanner/bayCaptureLight';
import { defaultBayVisualSettings } from '../components/scanner/bayControls';

function emptyExpertise(): CaptureSession {
  return {
    identity: { type: 'forfait_expertise', dossierId: 'IMPORTED', creationKey: 'selected' },
    synchronized: true,
    pending: false,
    error: '',
    capture: {
      dossier_id: 'IMPORTED',
      capture_id: null,
      phase: null,
      status: 'completed',
      expected_count: 4,
      saved_count: 0,
      photos: [],
      error_code: null,
      analysis_error: null,
    },
    response: {
      dossier_id: 'IMPORTED',
      type: 'forfait_expertise',
      status: 'not_analyzed',
      workflow_status: 'awaiting_photos',
      vehicle: { marque: 'Dacia', modele: 'Sandero', matricule: '2345-B-3' },
      photos: [],
      progress: null,
      result: null,
      error: null,
    },
  };
}

it('keeps an empty imported dossier idle after refresh without starting hardware or AI', async () => {
  const snapshot = emptyExpertise();
  const service = {
    readDossier: vi.fn().mockResolvedValue(snapshot.response),
    readCapture: vi.fn().mockResolvedValue(snapshot.capture),
    createDraft: vi.fn(),
    patchMetadata: vi.fn(),
    startCapture: vi.fn(),
    startScan: vi.fn(),
  };
  const storage = { getItem: () => null, setItem: vi.fn() } as unknown as Storage;
  const store = createTunnelCaptureStore(service, storage);
  store.resume();
  try {
    store.restoreExisting('forfait_expertise', undefined, 'IMPORTED');
    await store.refresh();
    const session = store.getSnapshot()!;
    expect(expertiseCaptureNeedsRestart(session)).toBe(true);
    expect(captureLabel(session)).toBe('Prêt à scanner');
    expect(getCapturePresentation(session, '/?parcours=forfait-expertise&scene=1')).toBeNull();
    const frame = createCapturePresentation()(
      getCaptureLight(session),
      0,
      1,
      false,
      defaultBayVisualSettings,
    );
    expect(frame.color.getHexString()).toBe('ffffff');
    expect(frame.sweepOpacity).toBe(0);
    expect(frame.animate).toBe(false);
    for (const write of [
      service.createDraft,
      service.patchMetadata,
      service.startCapture,
      service.startScan,
    ])
      expect(write).not.toHaveBeenCalled();
  } finally {
    store.stop();
  }
});

it.each(['queued', 'processing'] as const)(
  'preserves confirmed %s AI while stopping the physical scan frame',
  (status) => {
    const session = emptyExpertise();
    session.response!.status = status;
    session.capture!.slow_mode = true;
    expect(expertiseCaptureNeedsRestart(session)).toBe(false);
    expect(getCapturePresentation(session, '/')).toBe('analysis');
    const frame = createCapturePresentation()(
      getCaptureLight(session),
      0,
      1,
      false,
      defaultBayVisualSettings,
    );
    expect(frame.color.getHexString()).toBe('ff0000');
    expect(frame.sweepOpacity).toBe(0);
    expect(frame.animate).toBe(false);
  },
);

it('does not reset delivered evidence while the dossier photo list is catching up', () => {
  const session = emptyExpertise();
  session.capture!.saved_count = 1;
  expect(expertiseCaptureNeedsRestart(session)).toBe(false);
});
