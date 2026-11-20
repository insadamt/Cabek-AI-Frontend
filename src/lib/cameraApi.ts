/** Read camera identities and media through Cabek only; depends on shared API configuration. */
import { apiBaseUrl, isPreview, resolveMediaUrl } from './api';
import type { PhotoPhase, PhotoSide } from '../workflowTypes';

export interface Camera {
  channel: number;
  name: string;
  role: 'essential' | 'zoom' | 'diagnostic';
  side: PhotoSide | null;
  online: boolean;
  stream_url: string;
  latest_image_url: string;
  error_message?: string | null;
}
export interface CameraCatalog {
  source: 'demo' | 'tiandy' | 'disabled';
  cameras: Camera[];
}
export async function readCameras(
  phase?: PhotoPhase,
  signal?: AbortSignal,
): Promise<CameraCatalog> {
  if (isPreview) throw new Error('Connectez CABEK AI pour accéder aux caméras.');
  const query = phase ? `?phase=${phase}` : '';
  const response = await fetch(`${import.meta.env.DEV ? '' : apiBaseUrl}/api/cameras${query}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    cache: 'no-store',
    redirect: 'error',
    credentials: 'omit',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message ?? 'Caméras indisponibles.');
  return result;
}
export const cameraMediaUrl = (path: string) => resolveMediaUrl(path);

export function unavailableCameras(catalog: CameraCatalog, selected: number[]) {
  return catalog.cameras.filter(
    (camera) =>
      (camera.role === 'essential' || selected.includes(camera.channel)) && !camera.online,
  );
}

export function cameraSelectionReady(catalog: CameraCatalog | null, selected: number[]) {
  return (
    !!catalog &&
    catalog.source !== 'disabled' &&
    catalog.cameras.filter((camera) => camera.role === 'essential').length === 4 &&
    selected.every((channel) =>
      catalog.cameras.some((camera) => camera.channel === channel && camera.role === 'zoom'),
    ) &&
    unavailableCameras(catalog, selected).length === 0
  );
}
