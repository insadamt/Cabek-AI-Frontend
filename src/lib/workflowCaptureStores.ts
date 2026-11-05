/** Keeps workflow drafts independent across navigation and reloads; depends on identity-only tunnel stores and browser storage. */
import { captureStorageKey, createTunnelCaptureStore, readCaptureIdentity } from './tunnelCapture';
import type { CreatableDossierType } from '../workflowTypes';

const activeWorkflowKey = 'cabek.tunnel-workflow.v1';
const workflowStorageKey = (type: CreatableDossierType) => `${captureStorageKey}.${type}`;

export function createWorkflowCaptureStores(storage?: Storage) {
  const legacy = readCaptureIdentity(storage);
  // Migrate the existing draft before removing its shared identity so it remains resumable.

  if (legacy && storage) {
    const key = workflowStorageKey(legacy.type);
    if (!storage.getItem(key)) storage.setItem(key, JSON.stringify(legacy));
    storage.setItem(activeWorkflowKey, legacy.type);
    storage.removeItem(captureStorageKey);
  }
  const stores = {
    chiffrage_rapide: createTunnelCaptureStore(
      undefined,
      storage,
      workflowStorageKey('chiffrage_rapide'),
    ),
    verification: createTunnelCaptureStore(undefined, storage, workflowStorageKey('verification')),
  };
  let activeType: CreatableDossierType =
    storage?.getItem(activeWorkflowKey) === 'verification' ? 'verification' : 'chiffrage_rapide';
  const listeners = new Set<() => void>();
  for (const type of ['chiffrage_rapide', 'verification'] as const) {
    let identity = stores[type].getSnapshot()?.identity;
    stores[type].subscribe(() => {
      const next = stores[type].getSnapshot()?.identity;
      if (next && next !== identity) {
        activeType = type;
        storage?.setItem(activeWorkflowKey, type);
        listeners.forEach((listener) => listener());
      }
      identity = next;
    });
  }
  return {
    stores,
    getActiveType: () => activeType,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
