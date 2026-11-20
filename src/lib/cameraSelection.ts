/** Persist zoom choices per dossier and phase; depends on browser storage, never capture endpoints. */
import type { PhotoPhase } from '../workflowTypes';

export const zoomChannels = [1, 2, 5, 6, 7, 8, 11, 12];
export const cameraSelectionKey = (id: string, phase?: PhotoPhase) =>
  `cabek.camera-selection.v1.${encodeURIComponent(id)}.${phase ?? 'single'}`;

export function readCameraSelection(
  storage: Pick<Storage, 'getItem'>,
  id: string,
  phase?: PhotoPhase,
): number[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(cameraSelectionKey(id, phase)) ?? '[]');
    return Array.isArray(value)
      ? [...new Set(value.filter((channel) => zoomChannels.includes(channel)))]
      : [];
  } catch {
    return [];
  }
}
export function saveCameraSelection(
  storage: Pick<Storage, 'setItem'>,
  id: string,
  channels: number[],
  phase?: PhotoPhase,
) {
  storage.setItem(
    cameraSelectionKey(id, phase),
    JSON.stringify(channels.filter((channel) => zoomChannels.includes(channel))),
  );
}
