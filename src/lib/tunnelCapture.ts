/**
 * Owns one recoverable workflow session without persisting business state in the browser.
 * Depends on the documented capture API and durable identity storage; only explicit operator actions write to the backend.
 */
import * as api from './api';
import { validDate } from './workflows';
import { canCaptureExpertise } from './expertiseCapture';
import type { CaptureIdentity, CaptureSession, MetadataPatch } from '../captureTypes';
import type { DossierResponse } from '../types';
import type { CreatableDossierType, DossierType, PhotoPhase } from '../workflowTypes';

export const captureStorageKey = 'cabek.tunnel-session.v1';

export function hasVehicleMetadata(response?: DossierResponse) {
  const vehicle = response?.vehicle;
  return (
    !!vehicle?.marque_id &&
    !!vehicle.model_id &&
    !!vehicle.matricule.trim() &&
    validDate(vehicle.date_mise_en_circulation ?? null)
  );
}

export function capturePhotosReady(session: CaptureSession | null) {
  const capture = session?.capture;
  const response = session?.response;
  if (
    !session?.synchronized ||
    session.pending ||
    session.saving ||
    !capture ||
    !response ||
    capture.status !== 'completed' ||
    capture.expected_count < 1 ||
    capture.saved_count !== capture.expected_count ||
    capture.photos.length !== capture.saved_count ||
    response.dossier_id !== session.identity.dossierId
  )
    return false;

  // Opening the saved originals must not wait for vehicle selection, AI inference or pricing.

  return capture.photos.every((photo) =>
    response.photos.some(
      (saved) => saved.photo_id === photo.photo_id && saved.phase === photo.phase,
    ),
  );
}

export function captureReady(session: CaptureSession | null) {
  if (
    !session?.synchronized ||
    session.pending ||
    session.capture?.status !== 'completed' ||
    !session.response ||
    (session.identity.type !== 'forfait_expertise' && !hasVehicleMetadata(session.response))
  )
    return false;
  const response = session.response!;
  if (session.identity.type === 'forfait_expertise')
    return capturePhotosReady(session) && response.status === 'completed' && !!response.result;
  if (session.identity.type === 'chiffrage_rapide')
    return (
      response.status === 'completed' &&
      response.workflow_status === 'estimated' &&
      !!response.result
    );
  return session.identity.phase === 'after'
    ? response.workflow_status === 'comparison_ready' && !!response.comparison?.finalized
    : response.workflow_status === 'awaiting_after' &&
        response.comparison?.missing_before.length === 0;
}

export function captureLabel(session: CaptureSession) {
  if (session.pending)
    return session.identity.dossierId ? 'Connexion au tunnel…' : 'Création du brouillon…';
  if (session.error) return 'Reconnexion nécessaire';
  if (!session.synchronized) return 'Restauration du dossier…';
  if (session.capture?.status === 'failed')
    return session.identity.type === 'forfait_expertise'
      ? 'Capture échouée · Recommencez le scan'
      : 'Capture interrompue';
  if (session.capture?.status === 'capturing') return 'Réception des photographies';
  if (session.capture?.status !== 'completed')
    return session.identity.type === 'forfait_expertise' || hasVehicleMetadata(session.response)
      ? 'Prêt à scanner'
      : 'Fiche véhicule à compléter';
  if (session.capture.analysis_error || session.response?.status === 'failed')
    return 'Analyse à relancer';
  if (session.response?.progress?.stage === 'awaiting_metadata')
    return 'Estimation en attente : complétez la fiche véhicule';
  if (
    session.identity.type !== 'forfait_expertise' &&
    !hasVehicleMetadata(session.response) &&
    !['queued', 'processing'].includes(session.response?.status ?? '')
  )
    return 'Compléter la fiche véhicule';
  if (captureReady(session)) return 'Dossier enregistré';
  const stages = {
    queued: 'Analyse IA en attente',
    preparing: 'Préparation de l’analyse IA',
    analyzing_photos: 'Analyse IA des photographies',
    finalizing: 'Chiffrage et rapport en cours',
    completed: 'Analyse IA terminée',
    failed: 'Analyse IA interrompue',
  };
  return session.identity.type === 'verification'
    ? 'Synchronisation des preuves…'
    : (stages[session.response?.progress?.stage as keyof typeof stages] ?? 'Analyse IA en cours');
}

export function readCaptureIdentity(
  storage?: Storage,
  storageKey = captureStorageKey,
): CaptureIdentity | undefined {
  try {
    const value = JSON.parse(storage?.getItem(storageKey) ?? 'null');
    if (
      !value ||
      !['forfait_expertise', 'chiffrage_rapide', 'verification'].includes(value.type) ||
      typeof value.creationKey !== 'string' ||
      !value.creationKey.length ||
      (value.dossierId !== undefined && typeof value.dossierId !== 'string') ||
      (value.type === 'verification' && !['before', 'after'].includes(value.phase)) ||
      (value.type !== 'verification' && value.phase !== undefined) ||
      (value.type === 'forfait_expertise' &&
        (typeof value.dossierId !== 'string' || !value.dossierId.trim()))
    )
      return undefined;
    return value as CaptureIdentity;
  } catch {
    return undefined;
  }
}

type CaptureApi = Pick<
  typeof api,
  'createDraft' | 'readDossier' | 'readCapture' | 'startCapture' | 'patchMetadata' | 'startScan'
>;

export function createTunnelCaptureStore(
  service: CaptureApi = api,
  storage?: Storage,
  storageKey = captureStorageKey,
) {
  const restored = readCaptureIdentity(storage, storageKey);
  let session: CaptureSession | null = restored
    ? { identity: restored, synchronized: false, pending: false, error: '' }
    : null;
  const listeners = new Set<() => void>();
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reading: AbortController | undefined;
  let refreshing: Promise<void> | undefined;
  let creating: Promise<DossierResponse> | undefined;
  let starting = false;
  let saving = false;
  let revision = 0;
  let actionError = '';
  const writes = new Set<AbortController>();

  function publish(update: Partial<CaptureSession>) {
    if (!session) return;
    const receivedAt = update.response ? performance.now() : session.receivedAt;
    const newAnalysis =
      update.response &&
      ['queued', 'processing'].includes(update.response.status) &&
      (!session.startedAt || session.response?.status === 'failed');
    session = {
      ...session,
      ...update,
      receivedAt,
      startedAt: newAnalysis ? receivedAt : session.startedAt,
    };
    listeners.forEach((listener) => listener());
  }

  function persist(identity: CaptureIdentity) {
    if (!storage)
      throw new Error(
        'Le stockage de reprise est indisponible. Activez le stockage du navigateur.',
      );
    storage.setItem(storageKey, JSON.stringify(identity));
  }

  function select(type: DossierType, phase?: PhotoPhase, dossierId?: string) {
    if (session) {
      if (
        session.identity.type !== type ||
        session.identity.phase !== phase ||
        (dossierId && session.identity.dossierId !== dossierId)
      )
        throw new Error('Reprenez le dossier actif avant de commencer une autre capture.');
      return;
    }
    if (type === 'forfait_expertise' && (!dossierId?.trim() || phase !== undefined))
      throw new api.ApiError('dossier_required', 422);
    const identity: CaptureIdentity =
      type === 'forfait_expertise'
        ? { type, dossierId: dossierId!, creationKey: crypto.randomUUID() }
        : { type, phase, dossierId, creationKey: crypto.randomUUID() };
    persist(identity);
    session = { identity, synchronized: false, pending: false, error: '' };
    listeners.forEach((listener) => listener());
  }

  async function ensureDraft() {
    if (!session) throw new Error('Choisissez un parcours.');
    if (session.identity.dossierId) return session.identity.dossierId;
    if (session.identity.type === 'forfait_expertise')
      throw new api.ApiError('dossier_required', 422);
    if (!creating) {
      const identity = session.identity;
      const controller = new AbortController();
      writes.add(controller);
      creating = service
        .createDraft(identity.type, identity.creationKey, controller.signal)
        .then((response) => {
          const saved = { ...identity, dossierId: response.dossier_id };
          // Persist identity before starting hardware so reload can only resume this dossier.
          persist(saved);
          publish({ identity: saved, response });
          return response;
        })
        .finally(() => {
          creating = undefined;
          writes.delete(controller);
        });
    }
    return (await creating).dossier_id;
  }

  async function refresh() {
    if (!active || !session?.identity.dossierId) return;
    if (refreshing) return refreshing;
    const identity = session.identity;
    const currentRevision = revision;
    const controller = new AbortController();
    reading = controller;
    refreshing = (async () => {
      const results = await Promise.allSettled([
        service.readDossier(identity.dossierId!, controller.signal),
        service.readCapture(identity.dossierId!, identity.phase, controller.signal),
      ]);
      if (
        controller.signal.aborted ||
        session?.identity !== identity ||
        revision !== currentRevision
      )
        return;
      const [detail, capture] = results;
      if (
        identity.type === 'forfait_expertise' &&
        detail.status === 'fulfilled' &&
        (detail.value.dossier_id !== identity.dossierId ||
          (detail.value.type ?? 'forfait_expertise') !== identity.type ||
          (capture.status === 'fulfilled' && capture.value.dossier_id !== identity.dossierId))
      ) {
        publish({
          synchronized: false,
          error: new api.ApiError('invalid_capture_dossier', 409).message,
        });
        return;
      }
      publish({
        ...(detail.status === 'fulfilled' ? { response: detail.value } : {}),
        ...(capture.status === 'fulfilled' ? { capture: capture.value } : {}),
        synchronized: detail.status === 'fulfilled' && capture.status === 'fulfilled',
        error: results.some((result) => result.status === 'rejected')
          ? api.describeError(results.find((result) => result.status === 'rejected')!.reason)
          : actionError,
      });
    })().finally(() => {
      if (reading === controller) {
        refreshing = undefined;
        reading = undefined;
      }
    });
    return refreshing;
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    if (!active || !session?.identity.dossierId || captureReady(session)) return;
    timer = setTimeout(
      async () => {
        await refresh();
        if (!captureReady(session)) schedule();
      },
      typeof document !== 'undefined' && document.hidden ? 15_000 : 1500,
    );
  }

  async function start(type: DossierType, phase?: PhotoPhase, dossierId?: string) {
    if (starting) return;
    starting = true;
    const controller = new AbortController();
    writes.add(controller);
    try {
      select(type, phase, dossierId);
      actionError = '';
      publish({ pending: true, error: '' });
      const id = await ensureDraft();
      // Read before admission; mounting/restoring never performs this POST.
      const detail = await service.readDossier(id, controller.signal);
      const capture = await service.readCapture(id, phase, controller.signal);
      if (
        type === 'forfait_expertise' &&
        (detail.dossier_id !== id ||
          capture.dossier_id !== id ||
          (detail.type ?? 'forfait_expertise') !== type)
      )
        throw new api.ApiError('invalid_capture_dossier', 409);
      revision++;
      publish({ response: detail, capture, synchronized: true });
      if (capture.status === 'capturing') return;

      // Existing jobs remain followable; every new capture or AI retry requires saved vehicle details.

      const alreadyRunning =
        capture.status === 'completed' &&
        ['queued', 'processing', 'completed'].includes(detail.status);
      if (
        type === 'forfait_expertise' &&
        capture.status !== 'completed' &&
        !canCaptureExpertise(detail)
      )
        throw new api.ApiError('capture_not_allowed', 409);
      if (type !== 'forfait_expertise' && !alreadyRunning && !hasVehicleMetadata(detail))
        throw new api.ApiError('incomplete_vehicle_metadata', 422);
      if (capture.status === 'completed') {
        if (type === 'forfait_expertise' && detail.status === 'not_analyzed') {
          // Re-admit the saved capture so its prior admission error clears before expertise inputs freeze.

          publish({
            capture: await service.startCapture(id, phase, controller.signal),
            synchronized: false,
          });
          return;
        }
        if (type !== 'verification' && ['failed', 'not_analyzed'].includes(detail.status))
          publish({ response: await service.startScan(id, controller.signal) });
        return;
      }
      publish({
        capture: await service.startCapture(id, phase, controller.signal),
        synchronized: false,
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        actionError = api.describeError(error);
        publish({ error: actionError, synchronized: false });
      }
      throw error;
    } finally {
      writes.delete(controller);
      starting = false;
      publish({ pending: false });
      await refresh();
      schedule();
    }
  }

  async function save(
    type: CreatableDossierType,
    phase: PhotoPhase | undefined,
    patch: MetadataPatch,
  ) {
    if (session?.identity.type === 'forfait_expertise')
      throw new api.ApiError('externally_owned_dossier', 409);
    if (saving) return;
    saving = true;
    const controller = new AbortController();
    writes.add(controller);
    try {
      select(type, phase);
      publish({ saving: true });
      const id = await ensureDraft();
      revision++;
      const response = await service.patchMetadata(id, patch, controller.signal);
      revision++;
      publish({ response, synchronized: false });
    } finally {
      writes.delete(controller);
      saving = false;
      publish({ saving: false });
      await refresh();
      schedule();
    }
  }

  return {
    getSnapshot: () => session,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    resume() {
      active = true;
      void refresh().then(schedule);
    },
    stop() {
      active = false;
      if (timer) clearTimeout(timer);
      reading?.abort();
      writes.forEach((controller) => controller.abort());
    },
    start,
    save,
    refresh,
    restoreExisting(type: DossierType, phase: PhotoPhase | undefined, dossierId: string) {
      select(type, phase, dossierId);
      void refresh().then(schedule);
    },
    clear() {
      if (
        starting ||
        saving ||
        (session?.identity.type === 'forfait_expertise' &&
          (session.capture?.status === 'capturing' ||
            ['queued', 'processing'].includes(session.response?.status ?? '')))
      )
        return false;
      storage?.removeItem(storageKey);
      revision++;
      reading?.abort();
      reading = undefined;
      refreshing = undefined;
      actionError = '';
      if (timer) clearTimeout(timer);
      session = null;
      listeners.forEach((listener) => listener());
      return true;
    },
  };
}

export type TunnelCaptureStore = ReturnType<typeof createTunnelCaptureStore>;
