/** Interactive example workflows persisted per browser tab; depends on shared DTOs and saved-photo rules. */
import type { DossierResponse, DossierSummary, OriginalPhoto } from '../types';
import type { CreateDossierInput, UploadDossierPhotosInput } from '../workflowTypes';
import { ApiError } from '../lib/errors';
import { preloadImage } from '../lib/comparisonImages';
import { createPreviewAnalysis } from './data';
import {
  phaseSideCount,
  previewWorkflowStatus,
  validCreation,
  vehicleSides,
} from '../lib/workflows';

const storageKey = 'cabek-workflow-preview-v1';
let savedExamples: DossierResponse[] | undefined;

function example(
  id: string,
  type: 'chiffrage_rapide' | 'verification',
  before: number,
  after = 0,
): DossierResponse {
  const photos: OriginalPhoto[] = [];
  for (const phase of type === 'verification' ? (['before', 'after'] as const) : [null]) {
    const count = phase === 'after' ? after : before;
    vehicleSides.slice(0, count).forEach(([side], index) =>
      photos.push({
        photo_id: `${id}-${phase ?? 'photo'}-${side}`,
        side,
        phase,
        original_url: `/preview/vehicle.svg?view=${index}&phase=${phase}`,
      }),
    );
  }
  const response: DossierResponse = {
    dossier_id: id,
    type,
    created_at: '2026-10-28T09:00:00Z',
    updated_at: '2026-10-28T09:00:00Z',
    vehicle: {
      marque: 'Renault',
      modele: 'Clio',
      marque_id: 1,
      model_id: 10,
      matricule: '12345 · أ · 6',
      date_mise_en_circulation: '2023-04-10',
    },
    photos,
    status: 'not_analyzed',
    progress: null,
    error: null,
    result: null,
  };
  response.workflow_status = previewWorkflowStatus(response);
  return response;
}

export function workflowExamples() {
  if (!savedExamples) {
    try {
      const stored =
        typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : null;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => item.dossier_id && item.vehicle && Array.isArray(item.photos))
      )
        savedExamples = parsed;
    } catch {
      /* A blocked browser store still permits reading the built-in examples. */
    }
    if (!savedExamples) {
      const estimated = example('RAPIDE-APERCU-03', 'chiffrage_rapide', 1);
      estimated.status = 'completed';
      estimated.workflow_status = 'estimated';
      estimated.result = createPreviewAnalysis({
        ...estimated,
        created_at: estimated.created_at ?? null,
        photo_count: 1,
      });
      savedExamples = [
        example('RAPIDE-APERCU-01', 'chiffrage_rapide', 0),
        example('RAPIDE-APERCU-02', 'chiffrage_rapide', 1),
        estimated,
        example('VERIF-APERCU-01', 'verification', 2),
        example('VERIF-APERCU-02', 'verification', 4),
        example('VERIF-APERCU-03', 'verification', 4, 2),
        example('VERIF-APERCU-04', 'verification', 4, 4),
      ];
    }
  }
  return savedExamples;
}

function persistExample(response: DossierResponse) {
  const next = [
    ...workflowExamples().filter((item) => item.dossier_id !== response.dossier_id),
    response,
  ];
  // Commit memory only after storage succeeds so quota errors never claim a saved photograph.

  if (typeof sessionStorage !== 'undefined')
    sessionStorage.setItem(storageKey, JSON.stringify(next));
  savedExamples = next;
  return response;
}

export function workflowSummaries(): DossierSummary[] {
  return workflowExamples().map((response) => ({
    dossier_id: response.dossier_id,
    type: response.type,
    workflow_status: response.workflow_status,
    vehicle: response.vehicle,
    status: response.status,
    updated_at: response.updated_at,
    created_at: response.created_at ?? null,
    photo_count: response.photos.length,
  }));
}

export function createPreviewWorkflow(
  input: CreateDossierInput,
  names: { marque: string; modele: string },
) {
  if (!validCreation(input)) throw new ApiError('invalid_request', 422);
  const now = new Date().toISOString();
  return persistExample({
    dossier_id: `APERCU-${crypto.randomUUID()}`,
    type: input.type,
    vehicle: {
      marque_id: input.marque_id,
      model_id: input.model_id,
      matricule: input.matricule,
      date_mise_en_circulation: input.date_mise_en_circulation,
      annee: input.date_mise_en_circulation.slice(0, 4),
      ...names,
    },
    created_at: now,
    updated_at: now,
    workflow_status: input.type === 'verification' ? 'before_incomplete' : 'awaiting_photos',
    photos: [],
    status: 'not_analyzed',
    result: null,
    error: null,
    progress: null,
  });
}

function readFile(file: File, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    reader.onload = () => {
      cleanup();
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      cleanup();
      reject(new ApiError('invalid_image'));
    };
    reader.onabort = () => {
      cleanup();
      reject(new DOMException('Annulé', 'AbortError'));
    };
    function cleanup() {
      signal?.removeEventListener('abort', abort);
    }
    signal?.throwIfAborted();
    signal?.addEventListener('abort', abort, { once: true });
    reader.readAsDataURL(file);
  });
}

export async function uploadPreviewPhotos(input: UploadDossierPhotosInput, signal?: AbortSignal) {
  const response = workflowExamples().find((item) => item.dossier_id === input.dossierId);
  if (!response) throw new ApiError('dossier_not_found', 404);
  if (response.type === 'verification') {
    if (
      !input.phase ||
      input.files.length !== 1 ||
      (input.phase === 'after' && phaseSideCount(response.photos, 'before') !== 4) ||
      response.photos.some((photo) => photo.side === input.side && photo.phase === input.phase)
    )
      throw new ApiError('invalid_request', 422);
  } else if (input.phase) throw new ApiError('invalid_request', 422);
  const additions = await Promise.all(
    input.files.map(async (file) => {
      const original_url = await readFile(file, signal);
      const image = await preloadImage(original_url, signal ?? new AbortController().signal);
      if (image.naturalWidth * image.naturalHeight > 20_000_000)
        throw new ApiError('invalid_image', 422);
      return {
        photo_id: crypto.randomUUID(),
        side: input.side,
        phase: input.phase ?? null,
        original_url,
      };
    }),
  );
  signal?.throwIfAborted();
  const next = {
    ...response,
    photos: [...response.photos, ...additions],
    updated_at: new Date().toISOString(),
  };
  next.workflow_status = previewWorkflowStatus(next);
  return persistExample(next);
}
