/** Checks ownership, active-work protection and verification recovery phase selection; depends on saved API DTOs. */
import { describe, expect, it } from 'vitest';
import {
  canResumeCapture,
  capturePhaseForDossier,
  isDossierBusy,
  isLocalDossier,
} from './dossierActions';
import type { DossierResponse } from '../types';

const draft: DossierResponse = {
  dossier_id: 'LOCAL-1',
  source: 'cabek_ai',
  type: 'chiffrage_rapide',
  status: 'not_analyzed',
  workflow_status: 'draft',
  vehicle: { marque: '', modele: '', matricule: '' },
  photos: [],
  progress: null,
  error: null,
  result: null,
};
describe('folder lifecycle policy', () => {
  it('protects external and untyped legacy folders', () => {
    expect(isLocalDossier(draft)).toBe(true);
    expect(isLocalDossier({ ...draft, source: 'external' })).toBe(false);
    expect(isLocalDossier({ ...draft, type: 'forfait_expertise' })).toBe(false);
    expect(isLocalDossier({ ...draft, source: undefined })).toBe(false);
  });
  it('blocks queued analysis, inference, metadata waits and capture', () => {
    expect(isDossierBusy({ ...draft, status: 'queued' })).toBe(true);
    expect(
      isDossierBusy({ ...draft, status: 'processing', workflow_status: 'awaiting_metadata' }),
    ).toBe(true);
    expect(isDossierBusy({ ...draft, workflow_status: 'capturing' })).toBe(true);
    expect(isDossierBusy({ ...draft, status: 'failed' })).toBe(false);
    expect(isDossierBusy({ ...draft, status: 'completed' })).toBe(false);
  });
  it('resumes unfinished folders but protects finished evidence and estimates', () => {
    expect(canResumeCapture(draft)).toBe(true);
    expect(canResumeCapture({ ...draft, status: 'completed' })).toBe(false);
    expect(
      canResumeCapture({ ...draft, type: 'verification', workflow_status: 'comparison_ready' }),
    ).toBe(false);
  });
  it('recovers AFTER evidence when BEFORE is locked, even after an interrupted capture', () => {
    expect(capturePhaseForDossier(draft)).toBeUndefined();
    expect(capturePhaseForDossier({ ...draft, type: 'verification' })).toBe('before');
    expect(
      capturePhaseForDossier({ ...draft, type: 'verification', workflow_status: 'awaiting_after' }),
    ).toBe('after');
    expect(
      capturePhaseForDossier({
        ...draft,
        type: 'verification',
        workflow_status: 'capture_failed',
        comparison: {
          slots: [],
          missing_before: [],
          missing_after: ['front'],
          before_locked: true,
          finalized: false,
        },
      }),
    ).toBe('after');
  });
});
