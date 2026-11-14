/**
 * Provide opt-in lighting diagnostics to operators at /maintenance/lights.
 * Depends on backend hardware capabilities; lifecycle ownership stays server-side.
 */
import { useEffect, useState } from 'react';
import {
  lightingRequest,
  loadLightingSession,
  previewPayload,
  type LightingSession,
} from '../lib/lightingApi';
import '../styles/lighting-maintenance.css';

export function LightingMaintenance() {
  const [session, setSession] = useState<LightingSession | null>(null);
  const [effectName, setEffectName] = useState('solid');
  const [color, setColor] = useState('#2563EB');
  const [brightness, setBrightness] = useState(80);
  const [duration, setDuration] = useState(2000);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const effect = session?.effects.find((item) => item.effect === effectName);
  const idle =
    session?.status.state === 'READY' && session.status.ready && !session.status.active_capture_id;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await loadLightingSession(controller.signal);
        if (!controller.signal.aborted) setSession(next);
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Connexion indisponible');
          setSession(null);
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 1000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  async function control(stop = false) {
    if (!effect || !idle) return;
    setBusy(true);
    setError('');
    try {
      await lightingRequest(
        stop ? '/stop' : '/effects',
        stop ? {} : previewPayload(effect, color, brightness, duration),
      );
      setSession(await loadLightingSession());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Commande refusée');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page lighting-maintenance">
      <a className="text-link" href="/">
        Retour à CABEK AI
      </a>
      <header className="page-heading">
        <div>
          <p className="eyebrow">MAINTENANCE</p>
          <h1>Éclairage extérieur</h1>
          <p>Les captures restent prioritaires. Les aperçus expirent automatiquement.</p>
        </div>
      </header>
      {session && (
        <>
          <div className="notice" aria-live="polite">
            <div>
              <strong>
                {session.status.state} · {session.status.active_effect}
              </strong>
              <p>
                {session.capabilities.driver} · {session.status.connection_status} ·{' '}
                {session.status.synchronized
                  ? 'Confirmé par le pilote'
                  : 'En attente de confirmation'}
              </p>
              <p>
                RGB {session.status.rgb.join(', ')} · {Math.round(session.status.brightness)} %
              </p>
              <p>
                {session.capabilities.simulated
                  ? 'SIMULATION — aucune sortie physique'
                  : 'RGB global — aucune zone indépendante'}
              </p>
              {!session.capabilities.supports_smooth_transitions && (
                <p>
                  Extension RGB non confirmée. Vérifiez la connexion et le firmware avant les
                  aperçus.
                </p>
              )}
              {session.status.last_error && <p>{session.status.last_error}</p>}
              {!idle && <p>Aperçu indisponible pendant une capture ou hors de l’état prêt.</p>}
            </div>
          </div>
          <div className="surface lighting-controls">
            <label>
              Effet
              <select value={effectName} onChange={(event) => setEffectName(event.target.value)}>
                {session.effects.map((item) => (
                  <option key={item.effect} value={item.effect} disabled={!item.supported}>
                    {item.effect}
                    {item.supported ? '' : ' — matériel incompatible'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Couleur
              <input
                type="color"
                value={color}
                disabled={!effect?.parameters.color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
            <label>
              Intensité : {brightness} %
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </label>
            <label>
              Durée (ms)
              <input
                type="number"
                min="100"
                max="120000"
                step="100"
                value={duration}
                disabled={!effect?.parameters.duration_ms}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
            <div className="lighting-actions">
              <button
                className="button button-primary"
                disabled={
                  busy || !idle || !effect?.supported || duration < 100 || duration > 120000
                }
                onClick={() => void control()}
              >
                Démarrer l’aperçu
              </button>
              <button
                className="button button-secondary"
                disabled={busy || !idle}
                onClick={() => void control(true)}
              >
                Arrêter l’aperçu
              </button>
            </div>
          </div>
          {session.status.pixels && (
            <div className="lighting-zones" aria-label="Simulation des zones logiques">
              {session.status.pixels.map((pixel, index) => (
                <span
                  key={index}
                  title={`Zone ${index}: ${pixel.join(', ')}`}
                  style={{ backgroundColor: `rgb(${pixel.join(',')})` }}
                />
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
