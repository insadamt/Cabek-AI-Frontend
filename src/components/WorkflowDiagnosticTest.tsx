/** Run explicit capture/AI tests against one operator-selected existing dossier.
 * Depends on production workflow APIs and eligibility checks; never creates or deletes evidence. */
import { useState } from 'react';
import { isPreview, readCapture, readDossier, startCapture, startScan } from '../lib/api';
import { navigate } from '../hooks/useNavigation';
import type { DossierResponse } from '../types';
import type { CaptureStatus } from '../captureTypes';
import type { PhotoPhase } from '../workflowTypes';

export function WorkflowDiagnosticTest() {
  const [id, setId] = useState('');
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [capture, setCapture] = useState<CaptureStatus | null>(null);
  const [phase, setPhase] = useState<PhotoPhase>('before');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function load(selected = id.trim()) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const value = await readDossier(selected);
      const status = await readCapture(selected, value.type === 'verification' ? phase : undefined);
      setDossier(value);
      setCapture(status);
    } catch (failure) {
      setDossier(null);
      setCapture(null);
      setError(failure instanceof Error ? failure.message : 'Dossier inaccessible.');
    } finally {
      setBusy(false);
    }
  }
  async function run(kind: 'capture' | 'analysis') {
    if (!dossier || !confirmed) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (kind === 'capture')
        setCapture(
          await startCapture(
            dossier.dossier_id,
            dossier.type === 'verification' ? phase : undefined,
          ),
        );
      else setDossier(await startScan(dossier.dossier_id));
      setMessage(
        kind === 'capture'
          ? 'Capture demandée. L’analyse démarre automatiquement pour les parcours IA.'
          : 'Analyse réelle demandée.',
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Test refusé.');
    } finally {
      setBusy(false);
    }
  }
  const active =
    dossier?.status === 'queued' ||
    dossier?.status === 'processing' ||
    capture?.status === 'capturing';
  const canCapture =
    dossier &&
    !active &&
    capture?.status !== 'completed' &&
    dossier.status !== 'completed' &&
    (dossier.type !== 'forfait_expertise' || dossier.photos.length === 0);
  const canAnalyze =
    dossier &&
    !active &&
    dossier.type !== 'verification' &&
    ['not_analyzed', 'failed'].includes(dossier.status) &&
    dossier.photos.length > 0 &&
    capture?.status !== 'failed';
  return (
    <div className="settings-subsection">
      <h3>Capture et analyse IA réelles</h3>
      <p className="settings-description">
        Utilisez un dossier prévu pour vos tests. Ces boutons utilisent les photographies, le
        matériel et les règles de votre installation. La capture peut démarrer automatiquement
        l’analyse.
      </p>
      <div className="settings-actions">
        <label>
          Identifiant du dossier de test
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setDossier(null);
              setCapture(null);
              setConfirmed(false);
            }}
          />
        </label>
        <button disabled={isPreview || busy || !id.trim()} onClick={() => void load()}>
          Charger le dossier
        </button>
      </div>
      {dossier && (
        <>
          <p>
            {dossier.dossier_id} · {dossier.vehicle.marque} {dossier.vehicle.modele} ·{' '}
            {dossier.status} · {dossier.photos.length} photo(s)
          </p>
          {dossier.type === 'verification' && (
            <label>
              Phase
              <select
                value={phase}
                onChange={(e) => {
                  setPhase(e.target.value as PhotoPhase);
                  setDossier(null);
                  setCapture(null);
                  setConfirmed(false);
                }}
              >
                <option value="before">Avant</option>
                <option value="after">Après</option>
              </select>
            </label>
          )}
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Ce dossier est destiné au test et peut recevoir une capture ou une analyse réelle.
          </label>
          <div className="settings-actions">
            <button
              disabled={busy || !confirmed || !canCapture}
              onClick={() => void run('capture')}
            >
              Tester la capture
            </button>
            <button
              disabled={busy || !confirmed || !canAnalyze}
              onClick={() => void run('analysis')}
            >
              Tester l’analyse IA
            </button>
            <button disabled={busy} onClick={() => void load(dossier.dossier_id)}>
              Actualiser le suivi
            </button>
            <button onClick={() => navigate(`/dossiers/${encodeURIComponent(dossier.dossier_id)}`)}>
              Ouvrir le dossier
            </button>
          </div>
          {capture && (
            <p className="settings-note">
              Capture : {capture.status} · {capture.saved_count}/{capture.expected_count}{' '}
              photographie(s) · {capture.slow_mode ? 'Mode lent' : 'Mode normal'}
            </p>
          )}
        </>
      )}
      {message && (
        <p className="settings-feedback" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
