/** Manage the next capture source and inspect immutable camera identities; depends on backend operation settings. */
import { useEffect, useState } from 'react';
import { readOperation, saveDemoMode } from '../lib/diagnosticsApi';
import { isPreview } from '../lib/api';
import { useCameras } from '../hooks/useCameras';
import '../styles/cameras.css';

export function CameraSettings({ active }: { active: boolean }) {
  const [demo, setDemo] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const cameras = useCameras(active && !isPreview);
  async function load() {
    try {
      setDemo((await readOperation()).demo_mode);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Paramètres indisponibles.');
    }
  }
  useEffect(() => {
    if (active && !isPreview) void load();
  }, [active]);
  async function toggle() {
    if (busy || demo === null) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      setDemo((await saveDemoMode(!demo)).demo_mode);
      setSaved(true);
      cameras.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sauvegarde impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card" aria-labelledby="camera-settings-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">CAMÉRAS</span>
          <h2 id="camera-settings-title">Mode démonstration</h2>
        </div>
        <button
          className="settings-switch"
          role="switch"
          aria-checked={demo === true}
          aria-label="Mode démonstration"
          disabled={isPreview || busy || demo === null}
          aria-busy={busy}
          onClick={() => void toggle()}
        >
          <span />
          {busy ? 'Sauvegarde…' : demo === null ? 'Indisponible' : demo ? 'Activé' : 'Désactivé'}
        </button>
      </header>
      <p>
        Activé : quatre photos exemples et des zooms simulés. Désactivé : caméras Tiandy réelles.
      </p>
      <p className="settings-note">
        L’éclairage et le mode lent restent actifs. Toute modification s’applique à la prochaine
        capture.
      </p>
      {saved && <p role="status">Mode sauvegardé sur ce PC.</p>}
      {(error || cameras.error) && (
        <p role="alert">
          {error || cameras.error}{' '}
          <button
            onClick={() => {
              void load();
              cameras.refresh();
            }}
          >
            Réessayer
          </button>
        </p>
      )}
      <p className="camera-source">
        {cameras.data?.source === 'demo'
          ? 'Démonstration'
          : cameras.data?.source === 'tiandy'
            ? 'Tiandy'
            : 'Source indisponible'}
      </p>
      <ul className="camera-status-list">
        {cameras.data?.cameras.map((camera) => (
          <li key={camera.channel}>
            <strong>{camera.name}</strong>
            <span>
              CH{camera.channel} ·{' '}
              {camera.role === 'essential'
                ? 'Essentielle'
                : camera.role === 'zoom'
                  ? 'Zoom optionnel'
                  : 'Diagnostic uniquement'}
            </span>
            <span data-online={camera.online}>{camera.online ? 'Disponible' : 'Indisponible'}</span>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Les noms et canaux proviennent de Tiandy. Centre est exclue des captures.
      </p>
    </section>
  );
}
