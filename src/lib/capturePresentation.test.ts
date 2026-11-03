/** Verifies durable capture identity never dictates island visibility; depends on authoritative DTOs and route-aware presentation. */
import { describe, expect, it } from 'vitest';
import type { CaptureSession } from '../captureTypes';
import { getCapturePresentation } from './capturePresentation';

function session(): CaptureSession {
  return {
    identity: { type: 'chiffrage_rapide', dossierId: 'SAVED', creationKey: 'stable' },
    synchronized: true,
    pending: false,
    error: '',
    capture: {
      dossier_id: 'SAVED',
      phase: null,
      capture_id: 'CAP',
      status: 'not_started',
      photos: [],
      saved_count: 0,
      expected_count: 0,
      error_code: null,
      analysis_error: null,
    },
    response: {
      dossier_id: 'SAVED',
      type: 'chiffrage_rapide',
      status: 'not_analyzed',
      workflow_status: 'draft',
      photos: [],
      vehicle: { marque: '', modele: '', matricule: '' },
      progress: null,
      error: null,
      result: null,
    },
  };
}
const tunnel = '/?parcours=chiffrage-rapide&scene=1';
describe('capture presentation policy', () => {
  it.each([
    '/',
    tunnel,
    '/categories/chiffrage-rapide/new',
    '/categories/forfait-expertise',
    '/dossiers/OTHER',
  ])('keeps an idle saved draft compact at %s', (path) => {
    expect(getCapturePresentation(session(), path)).toBeNull();
  });
  it('presents ongoing capture and AI independently from durable identity', () => {
    const saved = session();
    saved.capture!.status = 'capturing';
    expect(getCapturePresentation(saved, '/dossiers/OTHER')).toBe('capture');
    saved.capture!.status = 'completed';
    saved.response!.status = 'processing';
    expect(getCapturePresentation(saved, '/dossiers/OTHER')).toBe('analysis');
    saved.response!.status = 'not_analyzed';
    expect(getCapturePresentation(saved, '/dossiers/OTHER')).toBeNull();
  });
  it.each([tunnel, '/?reprendre=1', '/categories/chiffrage-rapide/new'])(
    'keeps recovery available on the matching tunnel %s',
    (path) => {
      const saved = session();
      saved.error = 'Service indisponible';
      expect(getCapturePresentation(saved, path)).toBe('recovery');
      expect(getCapturePresentation(saved, '/?parcours=verification&scene=1')).toBeNull();
    },
  );
  it('keeps incomplete metadata attention local to its capture route', () => {
    const saved = session();
    saved.capture!.status = 'completed';
    expect(getCapturePresentation(saved, tunnel)).toBe('metadata');
    expect(getCapturePresentation(saved, '/')).toBeNull();
  });
  it('does not confuse a restored unsynchronized session with a new operation', () => {
    const saved = session();
    saved.synchronized = false;
    delete saved.capture;
    delete saved.response;
    expect(getCapturePresentation(saved, '/')).toBeNull();
    expect(getCapturePresentation(saved, '/?reprendre=1')).toBe('recovery');
  });
  it('returns complete only with backend-confirmed readiness and hides it elsewhere', () => {
    const saved = session();
    saved.capture!.status = 'completed';
    saved.response = {
      ...saved.response!,
      status: 'completed',
      workflow_status: 'estimated',
      result: {} as never,
      vehicle: {
        marque: 'Dacia',
        modele: 'Sandero',
        marque_id: 1,
        model_id: 2,
        matricule: '84654-ب-454',
        date_mise_en_circulation: '2020-05-17',
      },
    };
    expect(getCapturePresentation(saved, tunnel)).toBe('complete');
    expect(getCapturePresentation(saved, '/dossiers/SAVED')).toBeNull();
    expect(getCapturePresentation(saved, '/')).toBeNull();
  });
});
