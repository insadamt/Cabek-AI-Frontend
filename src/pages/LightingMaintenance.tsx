/** Control the whole physical RGB strip independently of capture readiness.
 * Depends on the two-route lighting client; responses confirm only initial delivery. */
import { useRef, useState } from 'react';
import {
  effectPayload, lightingEffects, lightingRequest,
  type LightingEffect, type LightingResult,
} from '../lib/lightingApi';
import '../styles/lighting-maintenance.css';

export function LightingMaintenance() {
  const [effect, setEffect] = useState<LightingEffect>('solid');
  const [color, setColor] = useState('#FFFFFF');
  const [brightness, setBrightness] = useState(100);
  const [duration, setDuration] = useState(2000);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [easing, setEasing] = useState('ease_in_out');
  const [palette, setPalette] = useState('#0066FF, #8B00FF, #00FFFF');
  const [result, setResult] = useState<LightingResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const commandSequence = useRef(0);
  const animated = effect !== 'solid';

  async function control(off = false) {
    const sequence = ++commandSequence.current;
    setError('');
    if (!off) setBusy(true);
    try {
      const next = await lightingRequest(off ? '/off' : '/set', off ? undefined : effectPayload(
        effect, color, brightness, duration, speed, repeat, easing, palette,
      ));
      if (sequence === commandSequence.current) setResult(next);
    } catch (failure) {
      if (sequence === commandSequence.current) {
        setResult(null);
        setError(failure instanceof Error ? failure.message : 'Commande refusée');
      }
    } finally {
      if (!off) setBusy(false);
    }
  }

  return (
    <main className="page lighting-maintenance">
      <a className="text-link" href="/">Retour à CABEK AI</a>
      <header className="page-heading">
        <div>
          <p className="eyebrow">MAINTENANCE</p>
          <h1>Éclairage extérieur</h1>
          <p>Chaque commande remplace l’effet actuel. Arrêter éteint immédiatement le ruban.</p>
        </div>
      </header>
      <p className="notice">
        RGB global. Les animations et l’intensité variable nécessitent le firmware RGB.
        Un effet répété continue jusqu’à la prochaine commande.
      </p>
      <div className="surface lighting-controls">
        <label>
          Effet
          <select value={effect} onChange={(event) => setEffect(event.target.value as LightingEffect)}>
            {lightingEffects.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          Couleur
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <label>
          Intensité : {brightness} %
          <input type="range" min="0" max="100" value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))} />
        </label>
        {animated && <>
          <label>
            Durée du cycle (ms)
            <input type="number" min="1" max="120000" value={duration}
              onChange={(event) => setDuration(Number(event.target.value))} />
          </label>
          <label>
            Vitesse
            <input type="number" min="0.1" max="5" step="0.1" value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))} />
          </label>
          <label>
            Courbe
            <select value={easing} onChange={(event) => setEasing(event.target.value)}>
              {['linear', 'ease_in', 'ease_out', 'ease_in_out'].map((name) =>
                <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
            Répéter
          </label>
        </>}
        {['transition', 'color_cycle', 'cyber_morph'].includes(effect) && <label>
          Couleurs HEX séparées par des virgules
          <input value={palette} onChange={(event) => setPalette(event.target.value)} />
        </label>}
        <div className="lighting-actions">
          <button className="button button-primary"
            disabled={busy || (animated && (duration < 1 || duration > 120000 || speed < .1 || speed > 5))}
            onClick={() => void control()}>Appliquer</button>
          <button className="button button-secondary" onClick={() => void control(true)}>Arrêter</button>
        </div>
      </div>
      {result && <p className="notice" aria-live="polite">
        {result.status === 'off' ? 'OFF confirmé par l’ESP32.' :
          result.status === 'running' ? 'Animation acceptée, première commande confirmée.' :
          'Couleur confirmée par l’ESP32.'}
        {' '}L’apparence physique et les commandes futures ne sont pas vérifiées ici.
      </p>}
      {error && <p className="notice" role="alert">{error}</p>}
    </main>
  );
}
