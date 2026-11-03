/** Exercises durable capture admission/recovery against controlled backend responses, including partial evidence and concurrent edits. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureReady,
  captureStorageKey,
  createTunnelCaptureStore,
  hasVehicleMetadata,
  readCaptureIdentity,
} from './tunnelCapture';
import type { CaptureSession, CaptureStatus } from '../captureTypes';
import type { DossierResponse } from '../types';
import type { TunnelCaptureStore } from './tunnelCapture';

const emptyVehicle = { marque: '', modele: '', matricule: '' };
const vehicle = {
  marque: 'Dacia',
  modele: 'Sandero',
  marque_id: 12,
  model_id: 34,
  matricule: '84654-ب-454',
  date_mise_en_circulation: '2020-05-17',
};
function detail(update: Partial<DossierResponse> = {}): DossierResponse {
  return {
    dossier_id: 'REAL-42',
    type: 'chiffrage_rapide',
    workflow_status: 'draft',
    status: 'not_analyzed',
    vehicle: emptyVehicle,
    photos: [],
    result: null,
    error: null,
    progress: null,
    ...update,
  };
}
function capture(update: Partial<CaptureStatus> = {}): CaptureStatus {
  return {
    dossier_id: 'REAL-42',
    phase: null,
    capture_id: null,
    status: 'not_started',
    expected_count: 0,
    saved_count: 0,
    photos: [],
    error_code: null,
    analysis_error: null,
    ...update,
  };
}
function storageAdapter() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  } satisfies Storage;
}
const stores: TunnelCaptureStore[] = [];
function setup(storage = storageAdapter()) {
  const service = {
    createDraft: vi.fn().mockResolvedValue(detail()),
    readDossier: vi.fn().mockResolvedValue(detail()),
    readCapture: vi.fn().mockResolvedValue(capture()),
    startCapture: vi
      .fn()
      .mockResolvedValue(capture({ capture_id: 'CAP-1', status: 'capturing', expected_count: 4 })),
    patchMetadata: vi.fn().mockResolvedValue(detail({ vehicle })),
    startScan: vi.fn().mockResolvedValue(detail({ status: 'queued' })),
  };
  const store = createTunnelCaptureStore(service, storage);
  stores.push(store);
  store.resume();
  return { service, store, storage };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  stores.splice(0).forEach((store) => store.stop());
  vi.useRealTimers();
});

describe('persistent tunnel lifecycle', () => {
  it('creates a real empty draft before capture and retains only its identity', async () => {
    const { service, store, storage } = setup();
    await store.start('chiffrage_rapide');
    expect(service.createDraft).toHaveBeenCalledWith(
      'chiffrage_rapide',
      expect.any(String),
      expect.any(AbortSignal),
    );
    expect(service.startCapture).toHaveBeenCalledWith(
      'REAL-42',
      undefined,
      expect.any(AbortSignal),
    );
    expect(service.createDraft.mock.invocationCallOrder[0]).toBeLessThan(
      service.startCapture.mock.invocationCallOrder[0],
    );
    const saved = JSON.parse(storage.getItem(captureStorageKey)!);
    expect(saved.dossierId).toBe('REAL-42');
    expect(saved).not.toHaveProperty('response');
    expect(saved).not.toHaveProperty('photos');
  });
  it('coalesces repeated scanner activation while creation is pending', async () => {
    const { service, store } = setup();
    const draft = deferred<DossierResponse>();
    service.createDraft.mockReturnValue(draft.promise);
    const first = store.start('chiffrage_rapide');
    await store.start('chiffrage_rapide');
    expect(service.createDraft).toHaveBeenCalledOnce();
    draft.resolve(detail());
    await first;
    expect(service.startCapture).toHaveBeenCalledOnce();
  });
  it('reuses the original creation key after a lost response and reload', async () => {
    const first = setup();
    first.service.createDraft.mockRejectedValue(new Error('response lost'));
    await expect(first.store.start('chiffrage_rapide')).rejects.toThrow('response lost');
    const key = first.service.createDraft.mock.calls[0][1];
    first.store.stop();
    const second = setup(first.storage);
    await second.store.start('chiffrage_rapide');
    expect(second.service.createDraft.mock.calls[0][1]).toBe(key);
  });
  it('does not start capture if draft persistence fails', async () => {
    const { service, store } = setup();
    service.createDraft.mockRejectedValue(new Error('unavailable'));
    await expect(store.start('chiffrage_rapide')).rejects.toThrow();
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('blocks backend writes if recovery identity cannot be stored', async () => {
    const storage = storageAdapter();
    storage.setItem = () => {
      throw new Error('quota');
    };
    const { store, service } = setup(storage);
    await expect(store.start('chiffrage_rapide')).rejects.toThrow('quota');
    expect(service.createDraft).not.toHaveBeenCalled();
  });
  it('restores active backend state using GET only, including after stop/resume', async () => {
    const storage = storageAdapter();
    storage.setItem(
      captureStorageKey,
      JSON.stringify({ type: 'chiffrage_rapide', creationKey: 'stable', dossierId: 'REAL-42' }),
    );
    const { store, service } = setup(storage);
    service.readCapture.mockResolvedValue(
      capture({ status: 'capturing', saved_count: 2, expected_count: 5 }),
    );
    await store.refresh();
    store.stop();
    store.resume();
    await store.refresh();
    await vi.advanceTimersByTimeAsync(1500);
    expect(store.getSnapshot()?.capture?.saved_count).toBe(2);
    expect(service.createDraft).not.toHaveBeenCalled();
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('keeps partial real photos and retries the same dossier after a restart failure', async () => {
    const { service, store } = setup();
    await store.start('chiffrage_rapide');
    const photo = { photo_id: 'saved-id', status: 'saved' as const, original_url: '/real.jpg' };
    service.readCapture.mockResolvedValue(
      capture({
        status: 'failed',
        capture_id: 'CAP-1',
        saved_count: 1,
        expected_count: 4,
        photos: [photo],
        error_code: 'capture_interrupted',
      }),
    );
    await store.refresh();
    expect(store.getSnapshot()?.capture?.photos).toEqual([photo]);
    await store.start('chiffrage_rapide');
    expect(service.createDraft).toHaveBeenCalledOnce();
    expect(service.startCapture.mock.calls.map((args) => args[0])).toEqual(['REAL-42', 'REAL-42']);
  });
  it('does not relaunch an already capturing backend job', async () => {
    const { service, store } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'capturing' }));
    await store.start('chiffrage_rapide');
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('patches metadata concurrently without blocking capture or fabricating saved values', async () => {
    const { service, store } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'capturing' }));
    await store.start('chiffrage_rapide');
    const patch = deferred<DossierResponse>();
    service.patchMetadata.mockReturnValue(patch.promise);
    const saving = store.save('chiffrage_rapide', undefined, { matricule: '84654-ب-454' });
    await Promise.resolve();
    expect(store.getSnapshot()?.response?.vehicle.matricule).toBe('');
    service.readDossier.mockResolvedValue(detail({ vehicle }));
    patch.resolve(detail({ vehicle }));
    await saving;
    expect(service.patchMetadata).toHaveBeenCalledWith(
      'REAL-42',
      { matricule: '84654-ب-454' },
      expect.any(AbortSignal),
    );
    expect(store.getSnapshot()?.response?.vehicle.matricule).toBe('84654-ب-454');
    expect(store.getSnapshot()?.capture?.status).toBe('capturing');
    expect(service.createDraft).toHaveBeenCalledOnce();
  });
  it('retains saved metadata on validation failure', async () => {
    const { service, store } = setup();
    await store.start('chiffrage_rapide');
    service.patchMetadata.mockRejectedValue(new Error('invalid plate'));
    await expect(store.save('chiffrage_rapide', undefined, { matricule: 'bad' })).rejects.toThrow(
      'invalid plate',
    );
    expect(store.getSnapshot()?.response?.vehicle).toEqual(emptyVehicle);
  });
  it('does not consider inference or missing metadata sufficient for completion', async () => {
    const { service, store } = setup();
    service.readCapture.mockResolvedValue(
      capture({ status: 'completed', saved_count: 4, expected_count: 4 }),
    );
    service.readDossier.mockResolvedValue(
      detail({ status: 'processing', workflow_status: 'awaiting_metadata' }),
    );
    await store.start('chiffrage_rapide');
    expect(captureReady(store.getSnapshot())).toBe(false);
    expect(service.startScan).not.toHaveBeenCalled();
  });
  it('retries failed AI with scan rather than repeating capture or creation', async () => {
    const { service, store } = setup();
    service.readCapture.mockResolvedValue(capture({ status: 'completed' }));
    service.readDossier.mockResolvedValue(detail({ status: 'failed', vehicle }));
    await store.start('chiffrage_rapide');
    expect(service.startScan).toHaveBeenCalledOnce();
    expect(service.startCapture).not.toHaveBeenCalled();
  });
  it('retries automatic AI admission on completed capture when analysis never started', async () => {
    const { service, store } = setup();
    service.readCapture.mockResolvedValue(
      capture({ status: 'completed', analysis_error: 'worker_unavailable' }),
    );
    await store.start('chiffrage_rapide');
    expect(service.startCapture).not.toHaveBeenCalled();
    expect(service.startScan).toHaveBeenCalledOnce();
  });
  it('selects AFTER on a persisted eligible dossier without any creation or AI', async () => {
    const { service, store } = setup();
    service.readDossier.mockResolvedValue(detail({ type: 'verification', vehicle }));
    store.restoreExisting('verification', 'after', 'BEFORE-7');
    await store.refresh();
    await store.start('verification', 'after');
    expect(service.createDraft).not.toHaveBeenCalled();
    expect(service.startScan).not.toHaveBeenCalled();
    expect(service.startCapture).toHaveBeenCalledWith('BEFORE-7', 'after', expect.any(AbortSignal));
    expect(service.readCapture).toHaveBeenCalledWith('BEFORE-7', 'after', expect.any(AbortSignal));
  });
  it('requires metadata before AFTER evidence can become immutable, including a restore race', async () => {
    const { store, service } = setup();
    store.restoreExisting('verification', 'after', 'BEFORE-7');
    await expect(store.start('verification', 'after')).rejects.toMatchObject({
      code: 'incomplete_vehicle_metadata',
    });
    expect(service.startCapture).not.toHaveBeenCalled();
    expect(service.createDraft).not.toHaveBeenCalled();
  });
  it('keeps capture and dossier errors from falsely completing a retained response', async () => {
    const { service, store } = setup();
    await store.start('chiffrage_rapide');
    service.readCapture.mockRejectedValue(new Error('server offline'));
    await store.refresh();
    expect(store.getSnapshot()?.synchronized).toBe(false);
    expect(store.getSnapshot()?.error).toContain('server offline');
    expect(captureReady(store.getSnapshot())).toBe(false);
  });
  it('aborts outstanding reads and cancels polling when the app unmounts', async () => {
    const { service, store } = setup();
    await store.start('chiffrage_rapide');
    const pending = deferred<DossierResponse>();
    service.readDossier.mockReturnValue(pending.promise);
    const reading = store.refresh();
    const signal = service.readDossier.mock.calls.at(-1)![1];
    store.stop();
    expect(signal.aborted).toBe(true);
    pending.resolve(detail());
    await reading;
    const calls = service.readDossier.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(service.readDossier).toHaveBeenCalledTimes(calls);
  });
  it('rejects switching an unfinished session to a different category', async () => {
    const { store, service } = setup();
    await store.start('chiffrage_rapide');
    await expect(store.start('verification', 'before')).rejects.toThrow('dossier actif');
    expect(service.createDraft).toHaveBeenCalledOnce();
  });
});

describe('authoritative folder completion', () => {
  function session(response: DossierResponse): CaptureSession {
    return {
      identity: { type: 'chiffrage_rapide', creationKey: 'key', dossierId: 'REAL-42' },
      response,
      capture: capture({ status: 'completed', saved_count: 4, expected_count: 4 }),
      synchronized: true,
      pending: false,
      error: '',
    };
  }
  it('requires persisted result, complete vehicle and the backend estimated workflow', () => {
    const completed = detail({
      vehicle,
      status: 'completed',
      workflow_status: 'estimated',
      result: {} as NonNullable<DossierResponse['result']>,
    });
    expect(captureReady(session(completed))).toBe(true);
    expect(captureReady(session({ ...completed, result: null }))).toBe(false);
    expect(captureReady(session({ ...completed, vehicle: emptyVehicle }))).toBe(false);
    expect(captureReady({ ...session(completed), synchronized: false })).toBe(false);
    expect(captureReady({ ...session(completed), capture: capture({ status: 'capturing' }) })).toBe(
      false,
    );
  });
  it('permits BEFORE completion while AFTER requires a finalized comparison on the same dossier', () => {
    const comparison = {
      slots: [],
      missing_before: [],
      missing_after: [],
      before_locked: true,
      finalized: false,
    };
    const saved = session(
      detail({
        type: 'verification',
        vehicle,
        status: 'not_analyzed',
        workflow_status: 'awaiting_after',
        comparison,
      }),
    );
    saved.identity = { ...saved.identity, type: 'verification', phase: 'before' };
    expect(captureReady(saved)).toBe(true);
    saved.identity.phase = 'after';
    expect(captureReady(saved)).toBe(false);
    saved.response!.workflow_status = 'comparison_ready';
    saved.response!.comparison!.finalized = true;
    expect(captureReady(saved)).toBe(true);
  });
  it('validates metadata without requiring a fabricated price or AI result', () => {
    expect(hasVehicleMetadata(detail({ vehicle }))).toBe(true);
    expect(hasVehicleMetadata(detail())).toBe(false);
  });
  it('ignores corrupt or incompatible stored identity', () => {
    const storage = storageAdapter();
    storage.setItem(captureStorageKey, '{bad');
    expect(readCaptureIdentity(storage)).toBeUndefined();
    storage.setItem(captureStorageKey, JSON.stringify({ type: 'verification', creationKey: 'k' }));
    expect(readCaptureIdentity(storage)).toBeUndefined();
  });
});
