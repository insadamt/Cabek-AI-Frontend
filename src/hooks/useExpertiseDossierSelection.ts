/** Restore an explicitly selected imported dossier without creating or capturing anything.
 * Depends on route identity, current server metadata, and the durable expertise store.
 */
import { useEffect, useState } from 'react';
import { useNavigation } from './useNavigation';
import { canCaptureExpertise, expertiseTunnelPath } from '../lib/expertiseCapture';
import { describeError, readDossier } from '../lib/api';
import type { TunnelCaptureStore } from '../lib/tunnelCapture';

export function useExpertiseDossierSelection(enabled: boolean, store: TunnelCaptureStore | null) {
  const { searchParams, navigate } = useNavigation();
  const requestedId = enabled ? searchParams?.get('dossier') : null;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !requestedId || !store) return;
    const controller = new AbortController();
    setPending(true);
    setError('');
    async function select() {
      try {
        if (store!.getSnapshot()?.identity.dossierId === requestedId) {
          await store!.refresh();
          return;
        }
        const dossier = await readDossier(requestedId!, controller.signal);
        controller.signal.throwIfAborted();
        if (dossier.dossier_id !== requestedId || !canCaptureExpertise(dossier))
          throw new Error(
            'Ce dossier ne peut pas recevoir une nouvelle capture. Choisissez un dossier en attente de photos.',
          );
        if (!store!.clear())
          throw new Error(
            'Terminez la capture ou l’analyse du dossier actif avant de changer de dossier.',
          );
        store!.restoreExisting('forfait_expertise', undefined, dossier.dossier_id);
        await store!.refresh();
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeError(failure));
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void select();
    return () => controller.abort();
  }, [enabled, requestedId, store]);

  return {
    pending:
      pending ||
      (!!requestedId && !error && store?.getSnapshot()?.identity.dossierId !== requestedId),
    error,
    selectDossier: (dossierId: string) => navigate(expertiseTunnelPath(dossierId), {}, true),
  };
}
