/** Verify camera readiness and dossier/phase-specific choices; depends on isolated storage and fixed camera DTOs. */
import { describe, expect, it } from 'vitest';
import { readCameraSelection, saveCameraSelection } from './cameraSelection';
import { cameraSelectionReady, type CameraCatalog } from './cameraApi';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
const catalog: CameraCatalog = {
  source: 'demo',
  cameras: [4, 13, 14, 10, 1, 2, 3].map((channel) => ({
    channel,
    name: `Caméra ${channel}`,
    role: channel === 3 ? 'diagnostic' : channel <= 2 ? 'zoom' : 'essential',
    side: null,
    online: true,
    stream_url: '',
    latest_image_url: '',
  })),
};
describe('camera preparation', () => {
  it('starts empty and isolates inspection and verification phases across reloads', () => {
    const local = storage();
    expect(readCameraSelection(local, 'DOS')).toEqual([]);
    saveCameraSelection(local, 'DOS', [1, 12], 'before');
    expect(readCameraSelection(local, 'DOS', 'before')).toEqual([1, 12]);
    expect(readCameraSelection(local, 'DOS', 'after')).toEqual([]);
    expect(readCameraSelection(local, 'OTHER', 'before')).toEqual([]);
  });
  it('ignores invalid persisted camera choices', () => {
    const local = storage();
    saveCameraSelection(local, 'DOS', [1, 3, 4, 99]);
    expect(readCameraSelection(local, 'DOS')).toEqual([1]);
    expect(readCameraSelection({ getItem: () => '{invalid' }, 'DOS')).toEqual([]);
  });
  it('requires all four essentials and all selected zooms, but ignores unselected offline cameras', () => {
    const withOfflineZoom = {
      ...catalog,
      cameras: catalog.cameras.map((camera) => ({ ...camera, online: camera.channel !== 1 })),
    };
    expect(cameraSelectionReady(withOfflineZoom, [])).toBe(true);
    expect(cameraSelectionReady(withOfflineZoom, [1])).toBe(false);
    expect(cameraSelectionReady(catalog, [2])).toBe(true);
    expect(cameraSelectionReady(catalog, [3])).toBe(false);
    expect(cameraSelectionReady({ ...catalog, source: 'disabled' }, [])).toBe(false);
    expect(
      cameraSelectionReady(
        { ...catalog, cameras: catalog.cameras.filter((camera) => camera.channel !== 4) },
        [],
      ),
    ).toBe(false);
  });
});
