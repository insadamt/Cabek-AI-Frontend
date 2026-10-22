import axios from 'axios';
import type {
  DossierList,
  DossierQuery,
  DossierResponse,
  Vehicle,
  VehicleOption,
  VehicleSelection,
} from '../types';
import {
  getPreviewBrands,
  getPreviewDossiers,
  getPreviewModels,
  getPreviewResult,
} from '../preview/data';
import { ApiError, parseMetadataWarnings } from './errors';
import { validateVehicleCatalogue, validateVehicleMetadata } from './vehicleMetadata';
export { ApiError, describeError, failureMessage } from './errors';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
export const isPreview = apiBaseUrl.length === 0;
const client = axios.create({
  baseURL: import.meta.env.DEV ? '' : apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await operation()).data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (axios.isAxiosError(error)) {
      if (!error.response)
        throw new Error(
          'Connexion au service interrompue. Vérifiez votre connexion ou réessayez dans un instant.',
        );
      const body = error.response.data;
      const detail = body?.error ?? body?.detail ?? body;
      throw new ApiError(
        detail?.code ?? 'unknown_error',
        error.response.status,
        parseMetadataWarnings(detail?.warnings),
      );
    }
    throw error;
  }
}

export function listDossiers(query: DossierQuery, signal?: AbortSignal): Promise<DossierList> {
  if (isPreview) return Promise.resolve(getPreviewDossiers(query));
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

export async function startScan(id: string, signal?: AbortSignal): Promise<DossierResponse> {
  if (isPreview) throw new ApiError('preview_only');
  // Re-read persisted input: an old summary or an unsaved form must never authorize a scan.

  const dossier = await findDossierSummary(id, signal);
  if (!dossier) throw new ApiError('dossier_not_found', 404);
  if (dossier.status === 'completed') throw new ApiError('already_analyzed', 409);
  if (dossier.status === 'queued' || dossier.status === 'processing')
    throw new ApiError('scan_in_progress', 409);
  const warnings = validateVehicleMetadata(dossier.vehicle);
  if (warnings.length) throw new ApiError('invalid_metadata', 422, warnings);
  const [brands, models] = await Promise.all([
    listBrands(signal),
    listModels(dossier.vehicle.marque_id!, signal),
  ]);
  const catalogueWarnings = validateVehicleCatalogue(dossier.vehicle, brands, models);
  if (catalogueWarnings.length) throw new ApiError('invalid_metadata', 422, catalogueWarnings);
  signal?.throwIfAborted();
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

export function saveVehicle(id: string, selection: VehicleSelection): Promise<Vehicle> {
  if (isPreview) return Promise.reject(new ApiError('preview_only'));
  const warnings = validateVehicleMetadata(selection);
  if (warnings.length) return Promise.reject(new ApiError('invalid_metadata', 422, warnings));
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
