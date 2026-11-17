/** Shared CABEK Global transport and preview adapters; components never contact AutoEstimate directly. */
import axios from 'axios';
import { recordBrowserLog } from './browserLogs';
import type { CaptureStatus, MetadataPatch } from '../captureTypes';
import type { CreatableDossierType, PhotoPhase } from '../workflowTypes';
import type {
  CreateDossierInput,
  UploadDossierPhotosInput,
  WorkflowApiAdapter,
} from '../workflowTypes';
import { createPreviewWorkflow, uploadPreviewPhotos } from '../preview/workflows';
import { validCreation } from './workflows';
import type {
  DossierList,
  DossierQuery,
  DossierResponse,
  ResolvedVehicle,
  VehicleOption,
  VehicleSelection,
} from '../types';
import {
  getPreviewBrands,
  getPreviewDossiers,
  getPreviewModels,
  getPreviewResult,
} from '../preview/data';
import { ApiError } from './errors';
export { ApiError, describeError, failureMessage } from './errors';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
export const isPreview = apiBaseUrl.length === 0;
const client = axios.create({
  baseURL: import.meta.env.DEV ? '' : apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

// Upload one multipart file per request, matching CABEK Global's workflow_routes.py contract.

const workflowAdapter: WorkflowApiAdapter = {
  create: (input, signal) => request(() => client.post('/api/dossiers', input, { signal })),
  upload: async (input, signal, onPhotoSaved) => {
    let response: DossierResponse | undefined;
    let completed = 0;
    for (const file of input.files) {
      signal?.throwIfAborted();
      const body = new FormData();
      body.append('file', file);
      body.append('side', input.side);
      if (input.phase) body.append('phase', input.phase);
      const saved = await request<DossierResponse>(() =>
        client.post(`/api/dossiers/${encodeURIComponent(input.dossierId)}/photos`, body, {
          signal,
        }),
      );
      response = saved;
      if (!signal?.aborted) onPhotoSaved?.(saved, ++completed);
    }
    return response!;
  },
};
export const brandSortAvailable = isPreview;

// A stable key makes a lost creation response recoverable without another persistent dossier.

export function createDraft(
  type: CreatableDossierType,
  key: string,
  signal?: AbortSignal,
): Promise<DossierResponse> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() =>
    client.post(
      '/api/dossiers',
      { type },
      {
        signal,
        headers: { 'Idempotency-Key': key },
      },
    ),
  );
}

export function deleteDossier(id: string, signal?: AbortSignal): Promise<void> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() => client.delete(`/api/dossiers/${encodeURIComponent(id)}`, { signal }));
}

export function readCapture(
  id: string,
  phase?: PhotoPhase,
  signal?: AbortSignal,
): Promise<CaptureStatus> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() =>
    client.get(`/api/dossiers/${encodeURIComponent(id)}/capture`, {
      signal,
      params: phase ? { phase } : undefined,
    }),
  );
}

export function startCapture(
  id: string,
  phase?: PhotoPhase,
  signal?: AbortSignal,
): Promise<CaptureStatus> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() =>
    client.post(`/api/dossiers/${encodeURIComponent(id)}/capture`, phase ? { phase } : undefined, {
      signal,
    }),
  );
}

export function patchMetadata(
  id: string,
  input: MetadataPatch,
  signal?: AbortSignal,
): Promise<DossierResponse> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() =>
    client.patch(`/api/dossiers/${encodeURIComponent(id)}/metadata`, input, { signal }),
  );
}

export async function createDossier(
  input: CreateDossierInput,
  signal?: AbortSignal,
): Promise<DossierResponse> {
  if (!validCreation(input)) throw new ApiError('invalid_request', 422);
  signal?.throwIfAborted();
  if (isPreview) {
    const brand = getPreviewBrands().find((item) => item.id === input.marque_id);
    const model = getPreviewModels(input.marque_id).find((item) => item.id === input.model_id);
    if (!brand || !model) throw new ApiError('invalid_vehicle_selection', 422);
    return createPreviewWorkflow(input, { marque: brand.libelle, modele: model.libelle });
  }
  return workflowAdapter.create(input, signal);
}

export async function uploadDossierPhotos(
  input: UploadDossierPhotosInput,
  signal?: AbortSignal,
  onPhotoSaved?: (response: DossierResponse, completed: number) => void,
): Promise<DossierResponse> {
  if (
    !input.files.length ||
    input.files.some((file) => !['image/jpeg', 'image/png'].includes(file.type))
  )
    throw new ApiError('invalid_image', 422);
  if (input.files.some((file) => file.size > 10 * 1024 * 1024))
    throw new ApiError('upload_too_large', 413);
  if (isPreview) return uploadPreviewPhotos(input, signal);
  return workflowAdapter.upload(input, signal, onPhotoSaved);
}

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await operation()).data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (axios.isAxiosError(error)) {
      recordBrowserLog('api.http', error.response?.data?.error?.code ?? 'Connexion API interrompue', {
        code: String(error.response?.status ?? 'network_error'),
        request_id: error.response?.headers?.['x-request-id'],
      });
      if (!error.response)
        throw new Error(
          'Connexion au service interrompue. Vérifiez votre connexion ou réessayez dans un instant.',
        );
      throw new ApiError(
        error.response.data?.error?.code ?? 'unknown_error',
        error.response.status,
      );
    }
    throw error;
  }
}

export function listDossiers(query: DossierQuery, signal?: AbortSignal): Promise<DossierList> {
  if (isPreview) return Promise.resolve(getPreviewDossiers(query));
  if (query.sort === 'brand_asc') return Promise.reject(new ApiError('unsupported_sort'));
  return request(() =>
    client.get('/api/dossiers', {
      signal,
      params: { ...query, status: query.status === 'all' ? undefined : query.status },
    }),
  );
}

export function readDossier(id: string, signal?: AbortSignal): Promise<DossierResponse> {
  if (isPreview) return Promise.resolve(getPreviewResult(id));
  return request(() => client.get(`/api/dossiers/${encodeURIComponent(id)}/result`, { signal }));
}

export async function findDossierSummary(id: string, signal?: AbortSignal) {
  // A direct link must resolve an exact ID; the API search also returns partial matches.

  let offset = 0;
  while (true) {
    const page = await listDossiers({ search: id, status: 'all', limit: 100, offset }, signal);
    const summary = page.items.find((item) => item.dossier_id === id);
    if (summary || offset + page.limit >= page.total) return summary;
    offset += page.limit;
  }
}

export function startScan(id: string, signal?: AbortSignal): Promise<DossierResponse> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() =>
    client.post(`/api/dossiers/${encodeURIComponent(id)}/scan`, undefined, { signal }),
  );
}

export function listBrands(signal?: AbortSignal): Promise<VehicleOption[]> {
  if (isPreview) return Promise.resolve(getPreviewBrands());
  return request(() => client.get('/api/vehicles/marques', { signal }));
}

export function listModels(brandId: number, signal?: AbortSignal): Promise<VehicleOption[]> {
  if (isPreview) return Promise.resolve(getPreviewModels(brandId));
  return request(() =>
    client.get('/api/vehicles/models', { signal, params: { marque_id: brandId } }),
  );
}

export function saveVehicle(id: string, selection: VehicleSelection): Promise<ResolvedVehicle> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  return request(() => client.put(`/api/dossiers/${encodeURIComponent(id)}/vehicle`, selection));
}

export function resolveMediaUrl(path: string): string {
  if (isPreview) return path;
  const mediaUrl = new URL(path, `${apiBaseUrl}/`);
  if (!import.meta.env.DEV) return mediaUrl.href;

  // Images and PDFs must use the same proxy as JSON, including reverse-proxy prefixes.

  const backendUrl = new URL(`${apiBaseUrl}/`);
  if (mediaUrl.origin !== backendUrl.origin) return mediaUrl.href;
  const backendPrefix = backendUrl.pathname.replace(/\/$/, '');
  const pathname =
    backendPrefix && mediaUrl.pathname.startsWith(`${backendPrefix}/`)
      ? mediaUrl.pathname.slice(backendPrefix.length)
      : mediaUrl.pathname;
  return `${pathname}${mediaUrl.search}${mediaUrl.hash}`;
}

export async function downloadReport(id: string, reportUrl: string): Promise<void> {
  if (isPreview) throw new ApiError('preview_only');
  const report = await request<Blob>(() =>
    client.get(resolveMediaUrl(reportUrl), {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    }),
  );
  if (!report.type.includes('pdf')) throw new Error('Le rapport PDF est indisponible. Réessayez.');
  const url = URL.createObjectURL(report);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `rapport_${id}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
