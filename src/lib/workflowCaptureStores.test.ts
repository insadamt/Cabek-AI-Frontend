/** Guards workflow isolation and migration without browser automation; depends on in-memory identity storage and real capture stores. */
import { describe, expect, it } from 'vitest';
import { createWorkflowCaptureStores } from './workflowCaptureStores';
import { captureStorageKey } from './tunnelCapture';

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

describe('independent workflow capture sessions', () => {
  it('preserves both dossiers through switching and reload, and clears only the selected workflow', () => {
    const storage = memoryStorage();
    const registry = createWorkflowCaptureStores(storage);
    registry.stores.verification.restoreExisting('verification', 'after', 'PHOTOS-1');
    registry.stores.chiffrage_rapide.restoreExisting('chiffrage_rapide', undefined, 'QUICK-1');
    expect(registry.stores.verification.getSnapshot()?.identity).toMatchObject({
      dossierId: 'PHOTOS-1',
      phase: 'after',
    });
    const restored = createWorkflowCaptureStores(storage);
    expect(restored.stores.chiffrage_rapide.getSnapshot()?.identity.dossierId).toBe('QUICK-1');
    expect(restored.stores.verification.getSnapshot()?.identity.dossierId).toBe('PHOTOS-1');
    expect(restored.getActiveType()).toBe('chiffrage_rapide');
    restored.stores.chiffrage_rapide.clear();
    expect(restored.stores.verification.getSnapshot()?.identity.dossierId).toBe('PHOTOS-1');
    expect(
      createWorkflowCaptureStores(storage).stores.verification.getSnapshot()?.identity.dossierId,
    ).toBe('PHOTOS-1');
  });

  it('migrates an existing before/after draft without occupying quick estimation', () => {
    const storage = memoryStorage();
    storage.setItem(
      captureStorageKey,
      JSON.stringify({
        type: 'verification',
        phase: 'after',
        dossierId: 'EXISTING',
        creationKey: 'original-key',
      }),
    );
    const registry = createWorkflowCaptureStores(storage);
    expect(registry.stores.chiffrage_rapide.getSnapshot()).toBeNull();
    expect(registry.stores.verification.getSnapshot()?.identity).toMatchObject({
      dossierId: 'EXISTING',
      phase: 'after',
      creationKey: 'original-key',
    });
    expect(registry.getActiveType()).toBe('verification');
    expect(storage.getItem(captureStorageKey)).toBeNull();
  });
});
