/** Configure the next capture's completion gate with a backend-confirmed switch.
 * Depends on persistent operation settings; an active capture keeps its own snapshot. */
import { useEffect, useState } from 'react';
import { isPreview } from '../lib/api';
import { readOperation, saveOperation } from '../lib/diagnosticsApi';

export function OperationSettings() {
  const [mode, setMode] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function load() {
    setError('');
    try {
      setMode((await readOperation()).slow_mode);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Paramètres indisponibles.');
    }
  }
  useEffect(() => {
    if (!isPreview) void load();
  }, []);
  async function toggle() {
    if (mode === null || busy) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      setMode((await saveOperation(!mode)).slow_mode);
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sauvegarde impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card" aria-labelledby="operation-settings-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">FONCTIONNEMENT</span>
          <h2 id="operation-settings-title">Mode lent</h2>
        </div>
        <button
          className="settings-switch"
          role="switch"
          aria-checked={mode === true}
          aria-label="Activer le mode lent"
          disabled={isPreview || mode === null || busy}
          onClick={() => void toggle()}
        >
          <span />
          {mode ? 'Activé' : 'Désactivé'}
        </button>
      </header>
      <p className="settings-description">
        Le mode lent conserve l’éclairage extérieur rouge et les lumières intérieures allumées
        jusqu’à la fin de l’analyse IA. Le tunnel reste réservé pendant ce temps.
      </p>
      <p className="settings-description">
        En mode normal, l’extérieur devient vert et l’intérieur s’éteint dès la fin de la capture.
        Les captures avant / après terminent toujours leur séquence à la fin des photographies.
      </p>
      <p className="settings-note">Toute modification s’applique à la prochaine capture.</p>
      {isPreview && <p role="status">Mode aperçu · connectez l’API pour modifier ce paramètre.</p>}
      {saved && (
        <p className="settings-feedback" role="status">
          Paramètre sauvegardé sur ce PC.
        </p>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error} <button onClick={() => void load()}>Réessayer</button>
        </p>
      )}
    </section>
  );
}
