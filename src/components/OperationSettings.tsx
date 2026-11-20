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
          aria-label="Mode lent"
          aria-busy={busy || (!isPreview && mode === null && !error)}
          disabled={isPreview || mode === null || busy}
          onClick={() => void toggle()}
        >
          <span />
          {busy
            ? 'Sauvegarde…'
            : mode === null
              ? isPreview
                ? 'Aperçu'
                : error
                  ? 'Indisponible'
                  : 'Chargement…'
              : mode
                ? 'Activé'
                : 'Désactivé'}
        </button>
      </header>
      <p className="settings-description">
        Choisissez à quel moment libérer le tunnel et terminer la séquence d’éclairage.
      </p>
      <dl className="settings-mode-comparison">
        <div className={mode === false ? 'is-selected' : undefined}>
          <dt>
            <span className="settings-mode-dot" />
            Mode normal
          </dt>
          <dd>Extérieur vert et intérieur éteint dès la fin des photographies.</dd>
        </div>
        <div className={mode === true ? 'is-selected' : undefined}>
          <dt>
            <span className="settings-mode-dot" />
            Mode lent
          </dt>
          <dd>
            Extérieur rouge, intérieur allumé et tunnel réservé jusqu’à la fin de l’analyse IA.
          </dd>
        </div>
      </dl>
      <p className="settings-note">Toute modification s’applique à la prochaine capture.</p>
      <a className="settings-inline-help" href="#settings-guide-title">
        Comprendre les modes et les parcours avant / après
      </a>
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
