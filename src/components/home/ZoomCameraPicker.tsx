/** Confirm optional cameras before the explicit scan action; depends on the shared drawer and read-only camera catalog. */
import { useState } from 'react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { CameraPreview } from '../CameraPreview';
import { useCameras } from '../../hooks/useCameras';
import { cameraSelectionReady, unavailableCameras } from '../../lib/cameraApi';
import { readCameraSelection, saveCameraSelection } from '../../lib/cameraSelection';
import type { PhotoPhase } from '../../workflowTypes';
import '../../styles/cameras.css';

export function ZoomCameraPicker({
  dossierId,
  phase,
  onClose,
  onConfirm,
}: {
  dossierId: string;
  phase?: PhotoPhase;
  onClose: () => void;
  onConfirm: (channels: number[]) => void;
}) {
  const cameras = useCameras(true, phase);
  const [selected, setSelected] = useState(() =>
    readCameraSelection(localStorage, dossierId, phase),
  );
  const [focused, setFocused] = useState(1);
  const [storageError, setStorageError] = useState('');
  function toggle(channel: number) {
    const next = selected.includes(channel)
      ? selected.filter((value) => value !== channel)
      : [...selected, channel];
    try {
      saveCameraSelection(localStorage, dossierId, next, phase);
      setSelected(next);
      setStorageError('');
    } catch {
      setStorageError('Impossible de mémoriser la sélection. Vérifiez le stockage du navigateur.');
    }
  }
  const catalog = cameras.data;
  const unavailable = catalog ? unavailableCameras(catalog, selected) : [];
  const ready =
    cameras.visible && !cameras.error && !storageError && cameraSelectionReady(catalog, selected);
  return (
    <DetailsDrawer
      title="Caméras zoom"
      subtitle="Préparation de la capture"
      className="camera-picker"
      onClose={onClose}
    >
      {(requestClose) => (
        <>
          <p>
            Les quatre vues essentielles sont toujours incluses. Choisissez les zooms utiles à cette
            inspection.
          </p>
          <p className="camera-source" role="status">
            {catalog?.source === 'demo'
              ? 'Mode démonstration · photos exemples'
              : catalog?.source === 'tiandy'
                ? 'Caméras Tiandy'
                : catalog?.source === 'disabled'
                  ? 'Capture désactivée'
                  : 'Connexion aux caméras…'}
          </p>
          <div className="camera-essentials" aria-label="Caméras essentielles incluses">
            {catalog?.cameras
              .filter((camera) => camera.role === 'essential')
              .map((camera) => (
                <span key={camera.channel} data-online={camera.online}>
                  {camera.name} · {camera.online ? 'Incluse' : 'Indisponible'}
                </span>
              ))}
          </div>
          <div className="camera-zoom-grid" role="group" aria-label="Choix des caméras zoom">
            {catalog?.cameras
              .filter((camera) => camera.role === 'zoom')
              .map((camera) => (
                <div className="camera-zoom-card" key={camera.channel}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(camera.channel)}
                      disabled={!camera.online && !selected.includes(camera.channel)}
                      onChange={() => toggle(camera.channel)}
                    />
                    <span>
                      {camera.name}
                      <small>
                        CH{camera.channel} · {camera.online ? 'Disponible' : 'Indisponible'}
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-pressed={focused === camera.channel}
                    onClick={() => setFocused(camera.channel)}
                  >
                    Aperçu
                  </button>
                </div>
              ))}
          </div>
          {cameras.visible && (
            <CameraPreview
              key={`${focused}-${catalog?.source}`}
              demo={catalog?.source === 'demo'}
              camera={catalog?.cameras.find((camera) => camera.channel === focused)}
            />
          )}
          {unavailable.length > 0 && (
            <p role="alert">
              Caméras requises indisponibles : {unavailable.map((camera) => camera.name).join(', ')}
              .
            </p>
          )}
          {(cameras.error || storageError) && <p role="alert">{cameras.error || storageError}</p>}
          <footer className="camera-picker-footer">
            <button type="button" onClick={cameras.refresh}>
              Actualiser
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => requestClose(() => onConfirm(selected))}
            >
              Scanner · {4 + selected.length} photos
            </button>
          </footer>
        </>
      )}
    </DetailsDrawer>
  );
}
