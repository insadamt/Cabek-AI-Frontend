/** Present manual RGB tests inside settings; depends on backend-owned settings actions.
 * No hardware requests run on mount and OFF remains available during a pending test. */
import { useRef, useState } from 'react';
import { isPreview } from '../lib/api';
import {
  lightingEffects,
  testLights,
  type LightingEffect,
  type LightTest,
  type LightTestResult,
} from '../lib/settingsApi';

const effectLabels: Record<LightingEffect, string> = {
  solid: 'Couleur fixe',
  fade_in: 'Allumage progressif',
  fade_out: 'Extinction progressive',
  breathing: 'Respiration',
  pulse: 'Pulsation',
  transition: 'Transition de couleurs',
  color_cycle: 'Cycle de couleurs',
  cyber_morph: 'Métamorphose',
  system_awakening: 'Démarrage du système',
  target_lock: 'Verrouillage de cible',
  mission_complete: 'Mission terminée',
  warning: 'Avertissement',
  shutdown: 'Arrêt du système',
  police: 'Gyrophare',
};
const easingLabels: Record<string, string> = {
  linear: 'Linéaire',
  ease_in: 'Accélération progressive',
  ease_out: 'Décélération progressive',
  ease_in_out: 'Accélération et décélération',
};

export function LightingSettings() {
  const [effect, setEffect] = useState<LightingEffect>('solid');
  const [color, setColor] = useState('#FFFFFF');
  const [brightness, setBrightness] = useState(100);
  const [duration, setDuration] = useState(2000);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [easing, setEasing] = useState('ease_in_out');
  const [palette, setPalette] = useState('#0066FF, #8B00FF, #00FFFF');
  const [result, setResult] = useState<LightTestResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const commandSequence = useRef(0);
  const animated = effect !== 'solid';
  const usesPalette = ['transition', 'color_cycle', 'cyber_morph'].includes(effect);
  const usesColor = ['solid', 'fade_in', 'fade_out', 'breathing', 'pulse', 'transition'].includes(
    effect,
  );

  async function sendTest(off = false, preset?: string) {
    const sequence = ++commandSequence.current;
    setError('');
    setResult(null);
    if (!off) setBusy(true);
    const colors = palette.split(/[\s,;]+/).filter(Boolean);
    const payload: LightTest = preset
      ? { effect: 'solid', color: preset, brightness: 100 }
      : {
          effect,
          color,
          brightness,
          ...(animated ? { duration_ms: duration, speed, repeat, easing } : {}),
          ...(usesPalette && colors.length ? { colors } : {}),
        };
    try {
      const next = await testLights(off ? '/off' : '/set', off ? undefined : payload);
      if (sequence === commandSequence.current) setResult(next);
    } catch (failure) {
      if (sequence === commandSequence.current)
        setError(failure instanceof Error ? failure.message : 'Commande refusée');
    } finally {
      if (!off) setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-labelledby="lighting-settings-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">MATÉRIEL</span>
          <h2 id="lighting-settings-title">Éclairage du tunnel</h2>
        </div>
        <button className="settings-off" disabled={isPreview} onClick={() => void sendTest(true)}>
          Éteindre
        </button>
      </header>
      <p className="settings-description">
        Testez le ruban RGB depuis ce PC. Chaque test remplace l’effet actuel jusqu’à la prochaine
        commande. Les séquences de capture restent pilotées par CABEK AI.
      </p>
      {isPreview && (
        <p className="settings-note">Mode aperçu · connectez l’API pour commander l’éclairage.</p>
      )}
      <p className="settings-field-heading">Appliquer une couleur · intensité 100 %</p>
      <div className="settings-presets" aria-label="Couleurs de test">
        {[
          ['Rouge', '#FF0000'],
          ['Bleu', '#0000FF'],
          ['Vert', '#00FF00'],
          ['Blanc', '#FFFFFF'],
        ].map(([label, value]) => (
          <button
            key={value}
            disabled={isPreview || busy}
            onClick={() => void sendTest(false, value)}
          >
            <span className="settings-color-dot" style={{ backgroundColor: value }} />
            {label}
          </button>
        ))}
      </div>
      <p className="settings-field-heading">Personnaliser un test</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendTest();
        }}
      >
        <div className="settings-fields">
          <label>
            Effet
            <select
              value={effect}
              onChange={(event) => setEffect(event.target.value as LightingEffect)}
            >
              {lightingEffects.map((name) => (
                <option key={name} value={name}>
                  {effectLabels[name]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Couleur
            <input
              type="color"
              value={color}
              disabled={!usesColor}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label className="settings-wide">
            Intensité · {brightness} %
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(event) => setBrightness(Number(event.target.value))}
            />
          </label>
          {animated && (
            <>
              <label>
                Durée du cycle (ms)
                <input
                  type="number"
                  min="1"
                  max="120000"
                  required
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                />
              </label>
              <label>
                Vitesse
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  required
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
              </label>
              <label>
                Courbe
                <select
                  disabled={effect === 'police'}
                  value={easing}
                  onChange={(event) => setEasing(event.target.value)}
                >
                  {['linear', 'ease_in', 'ease_out', 'ease_in_out'].map((name) => (
                    <option key={name} value={name}>
                      {easingLabels[name]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(event) => setRepeat(event.target.checked)}
                />
                Répéter jusqu’à l’arrêt
              </label>
            </>
          )}
          {usesPalette && (
            <label className="settings-wide">
              Couleurs HEX séparées par des virgules
              <input
                value={palette}
                onChange={(event) => setPalette(event.target.value)}
                placeholder="#0066FF, #8B00FF, #00FFFF"
              />
            </label>
          )}
        </div>
        <footer className="settings-test-footer">
          <p>
            Les animations nécessitent le firmware RGB. Quitter les paramètres demande le retour à
            l’éclairage par défaut.
          </p>
          <button type="submit" className="button button-primary" disabled={isPreview || busy}>
            {busy ? 'Envoi…' : 'Tester l’éclairage'}
          </button>
        </footer>
      </form>
      {result && (
        <p className="settings-feedback" role="status">
          {result.status === 'off'
            ? 'OFF confirmé par l’ESP32.'
            : result.status === 'running'
              ? 'Animation acceptée · première commande confirmée.'
              : 'Couleur confirmée par l’ESP32.'}{' '}
          L’apparence physique et les commandes suivantes ne sont pas vérifiées ici.
        </p>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
