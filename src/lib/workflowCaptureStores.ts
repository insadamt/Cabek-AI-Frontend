/** Keeps workflow drafts independent across navigation and reloads; depends on identity-only tunnel stores and browser storage. */
import { captureStorageKey, createTunnelCaptureStore, readCaptureIdentity } from './tunnelCapture';
import type { DossierType } from '../workflowTypes';

const activeWorkflowKey = 'cabek.tunnel-workflow.v1';
const workflowStorageKey = (type: DossierType) => `${captureStorageKey}.${type}`;

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
    forfait_expertise: createTunnelCaptureStore(
      undefined,
      storage,
      workflowStorageKey('forfait_expertise'),
    ),
    chiffrage_rapide: createTunnelCaptureStore(
      undefined,
      storage,
      workflowStorageKey('chiffrage_rapide'),
    ),
    verification: createTunnelCaptureStore(undefined, storage, workflowStorageKey('verification')),
  };
  const storedType = storage?.getItem(activeWorkflowKey);
  let activeType: DossierType =
    storedType === 'verification' || storedType === 'forfait_expertise'
      ? storedType
      : 'chiffrage_rapide';
  const listeners = new Set<() => void>();
  for (const type of ['forfait_expertise', 'chiffrage_rapide', 'verification'] as const) {
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
