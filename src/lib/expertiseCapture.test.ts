/** Regress expertise selection and recovery without draft creation or metadata edits.
 * Depends on the real session store, in-memory storage, and controlled API responses.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureReady,
  captureStorageKey,
  createTunnelCaptureStore,
  readCaptureIdentity,
} from './tunnelCapture';
import { canCaptureExpertise, expertiseTunnelPath } from './expertiseCapture';
import { createWorkflowCaptureStores } from './workflowCaptureStores';
import type { CaptureSession, CaptureStatus } from '../captureTypes';
import type { DossierResponse } from '../types';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } as Storage;
}
function detail(update: Partial<DossierResponse> = {}): DossierResponse {
  return {
    dossier_id: 'EXPERT-1',
    type: 'forfait_expertise',
    source: 'external',
    status: 'not_analyzed',
    workflow_status: 'awaiting_photos',
    vehicle: { marque: 'Dacia', modele: 'Sandero', matricule: '84654-ب-454', annee: '2020' },
    photos: [],
    progress: null,
    error: null,
    result: null,
    ...update,
  };
}
function capture(update: Partial<CaptureStatus> = {}): CaptureStatus {
  return {
    dossier_id: 'EXPERT-1',
    phase: null,
    capture_id: null,
    status: 'not_started',
    saved_count: 0,
    expected_count: 0,
    photos: [],
    error_code: null,
    analysis_error: null,
    ...update,
  };
}
const stores: ReturnType<typeof createTunnelCaptureStore>[] = [];
afterEach(() => stores.splice(0).forEach((store) => store.stop()));
function setup(storage = memoryStorage()) {
  const service = {
    createDraft: vi.fn(),
    readDossier: vi.fn().mockResolvedValue(detail()),
    readCapture: vi.fn().mockResolvedValue(capture()),
    patchMetadata: vi.fn(),
    startCapture: vi
      .fn()
      .mockResolvedValue(capture({ status: 'capturing', capture_id: 'C1', expected_count: 2 })),
    startScan: vi.fn().mockResolvedValue(detail({ status: 'queued' })),
  };
  const store = createTunnelCaptureStore(service, storage);
  stores.push(store);
  store.resume();
  return { service, store, storage };
}

describe('existing expertise session admission', () => {
  it('requires a selected dossier and never falls back to creating one', async () => {
    const { store, service } = setup();
    await expect(store.start('forfait_expertise')).rejects.toMatchObject({
      code: 'dossier_required',
    });
    expect(store.getSnapshot()).toBeNull();
    expect(service.createDraft).not.toHaveBeenCalled();
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('restores an imported dossier without any mutation request', async () => {
    const { store, service } = setup();
    store.restoreExisting('forfait_expertise', undefined, 'EXPERT-1');
    await store.refresh();
    expect(store.getSnapshot()).toMatchObject({
      synchronized: true,
      response: { dossier_id: 'EXPERT-1' },
    });
    for (const write of [
      service.createDraft,
      service.patchMetadata,
      service.startCapture,
      service.startScan,
    ])
      expect(write).not.toHaveBeenCalled();
  });
  it('captures into the chosen legacy dossier without requiring quick-estimate metadata', async () => {
    const { store, service } = setup();
    await store.start('forfait_expertise', undefined, 'EXPERT-1');
    expect(service.startCapture).toHaveBeenCalledWith(
      'EXPERT-1',
      undefined,
      expect.any(AbortSignal),
    );
    expect(service.createDraft).not.toHaveBeenCalled();
    expect(service.patchMetadata).not.toHaveBeenCalled();
  });
  it('rejects a response from a different dossier or category before capture', async () => {
    for (const invalid of [detail({ dossier_id: 'OTHER' }), detail({ type: 'verification' })]) {
      const { store, service } = setup();
      service.readDossier.mockResolvedValue(invalid);
      await expect(store.start('forfait_expertise', undefined, 'EXPERT-1')).rejects.toMatchObject({
        code: 'invalid_capture_dossier',
      });
      expect(service.startCapture).not.toHaveBeenCalled();
    }
  });
  it('blocks fresh capture over an existing photo set', async () => {
    const { store, service } = setup();
    service.readDossier.mockResolvedValue(
      detail({
        workflow_status: 'ready_to_scan',
        photos: [{ photo_id: 'old', original_url: '/old.jpg' }],
      }),
    );
    await expect(store.start('forfait_expertise', undefined, 'EXPERT-1')).rejects.toMatchObject({
      code: 'capture_not_allowed',
    });
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('requests a fresh attempt in the same dossier after failed capture and prohibits metadata writes', async () => {
    const { store, service } = setup();
    service.readDossier.mockResolvedValue(detail({ workflow_status: 'capture_failed' }));
    service.readCapture.mockResolvedValue(capture({ status: 'failed', capture_id: 'durable' }));
    await store.start('forfait_expertise', undefined, 'EXPERT-1');
    await expect(
      store.save('chiffrage_rapide', undefined, { matricule: '123-A-456' }),
    ).rejects.toMatchObject({ code: 'externally_owned_dossier' });
    expect(service.startCapture).toHaveBeenCalledTimes(1);
    expect(service.patchMetadata).not.toHaveBeenCalled();
  });
  it('follows completed capture with active AI without submitting another job', async () => {
    const { store, service } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'completed', capture_id: 'C1' }));
    service.readDossier.mockResolvedValue(detail({ status: 'processing' }));
    await store.start('forfait_expertise', undefined, 'EXPERT-1');
    expect(service.startScan).not.toHaveBeenCalled();
    expect(service.startCapture).not.toHaveBeenCalled();
    expect(store.clear()).toBe(false);
  });
  it('retries a failed AI job without recapturing photos', async () => {
    const { store, service } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'completed', capture_id: 'C1' }));
    service.readDossier.mockResolvedValue(detail({ status: 'failed' }));
    await store.start('forfait_expertise', undefined, 'EXPERT-1');
    expect(service.startScan).toHaveBeenCalledWith('EXPERT-1', expect.any(AbortSignal));
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('re-admits a completed capture after AI admission failure without creating a new dossier', async () => {
    const { store, service } = setup();
    service.readCapture.mockResolvedValue(
      capture({ status: 'completed', capture_id: 'C1', analysis_error: 'worker_unavailable' }),
    );
    await store.start('forfait_expertise', undefined, 'EXPERT-1');
    expect(service.startCapture).toHaveBeenCalledWith(
      'EXPERT-1',
      undefined,
      expect.any(AbortSignal),
    );
    expect(service.createDraft).not.toHaveBeenCalled();
    expect(service.startScan).not.toHaveBeenCalled();
  });
  it('keeps dossier selection fixed during capture', async () => {
    const { store, service } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'capturing', capture_id: 'C1' }));
    store.restoreExisting('forfait_expertise', undefined, 'EXPERT-1');
    await store.refresh();
    expect(store.clear()).toBe(false);
    expect(() => store.restoreExisting('forfait_expertise', undefined, 'OTHER')).toThrow();
    expect(store.getSnapshot()?.identity.dossierId).toBe('EXPERT-1');
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('retains the selected dossier after tunnel failure for explicit retry', async () => {
    const { store, service } = setup();
    service.startCapture.mockRejectedValue(new Error('Tunnel unavailable'));
    await expect(store.start('forfait_expertise', undefined, 'EXPERT-1')).rejects.toThrow(
      'Tunnel unavailable',
    );
    expect(store.getSnapshot()?.identity.dossierId).toBe('EXPERT-1');
    expect(service.createDraft).not.toHaveBeenCalled();
  });
});

describe('expertise persistence and completion', () => {
  it('ignores stored expertise identities without an ID or with a verification phase', () => {
    const storage = memoryStorage();
    for (const invalid of [{}, { dossierId: '' }, { dossierId: 'EXPERT-1', phase: 'before' }]) {
      storage.setItem(
        captureStorageKey,
        JSON.stringify({ type: 'forfait_expertise', creationKey: 'stable', ...invalid }),
      );
      expect(readCaptureIdentity(storage)).toBeUndefined();
    }
  });
  it('keeps all three workflow identities independent through reload', () => {
    const storage = memoryStorage();
    const registry = createWorkflowCaptureStores(storage);
    registry.stores.chiffrage_rapide.restoreExisting('chiffrage_rapide', undefined, 'QUICK-1');
    registry.stores.verification.restoreExisting('verification', 'before', 'BEFORE-1');
    registry.stores.forfait_expertise.restoreExisting('forfait_expertise', undefined, 'EXPERT-1');
    const restored = createWorkflowCaptureStores(storage);
    expect(restored.getActiveType()).toBe('forfait_expertise');
    expect(restored.stores.forfait_expertise.getSnapshot()?.identity.dossierId).toBe('EXPERT-1');
    restored.stores.forfait_expertise.clear();
    expect(restored.stores.chiffrage_rapide.getSnapshot()?.identity.dossierId).toBe('QUICK-1');
    expect(restored.stores.verification.getSnapshot()?.identity.dossierId).toBe('BEFORE-1');
  });
  it('waits for both complete originals and saved AI results before opening expertise', () => {
    const photo = {
      photo_id: 'P1',
      original_url: '/original.jpg',
      phase: null,
      status: 'saved' as const,
    };
    const session: CaptureSession = {
      identity: { type: 'forfait_expertise', dossierId: 'EXPERT-1', creationKey: 'stable' },
      synchronized: true,
      pending: false,
      error: '',
      capture: capture({ status: 'completed', saved_count: 1, expected_count: 1, photos: [photo] }),
      response: detail({ status: 'processing', photos: [photo] }),
    };
    expect(captureReady(session)).toBe(false);
    session.response!.status = 'completed';
    session.response!.result = {} as never;
    expect(captureReady(session)).toBe(true);
    session.response!.photos = [];
    expect(captureReady(session)).toBe(false);
  });
  it('encodes the chosen dossier in the expertise route and excludes analyzed folders', () => {
    expect(expertiseTunnelPath('REF / 1')).toContain('dossier=REF%20%2F%201');
    expect(canCaptureExpertise(detail())).toBe(true);
    expect(canCaptureExpertise(detail({ status: 'completed' }))).toBe(false);
    expect(
      canCaptureExpertise(
        detail({
          workflow_status: 'ready_to_scan',
          photos: [{ photo_id: 'saved', original_url: '/saved.jpg' }],
        }),
      ),
    ).toBe(false);
    expect(canCaptureExpertise(detail({ workflow_status: 'ready_to_scan', photos: [] }))).toBe(
      true,
    );
    expect(canCaptureExpertise(detail({ status: 'failed', photos: [] }))).toBe(true);
  });
});
