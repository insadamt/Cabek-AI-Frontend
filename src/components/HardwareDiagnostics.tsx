/** Offer deliberate Shelly switching and live price lookup outside safe checks.
 * Depends on local maintenance APIs and the operator-selected workflow test component. */
import { useState, type FormEvent } from 'react';
import { isPreview } from '../lib/api';
import { testInterior, testPricing } from '../lib/diagnosticsApi';
import { WorkflowDiagnosticTest } from './WorkflowDiagnosticTest';

export function HardwareDiagnostics() {
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  async function interior(command: 'status' | 'on' | 'off') {
    setBusy(command);
    setError('');
    setResult('');
    try {
      setResult(JSON.stringify(await testInterior(command), null, 2));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Test refusé.');
    } finally {
      setBusy('');
    }
  }
  async function pricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy('pricing');
    setError('');
    setResult('');
    try {
      const response = await testPricing({
        marque_id: Number(fields.get('marque_id')),
        model_id: Number(fields.get('model_id')),
        part_id: Number(fields.get('part_id')),
        type_piece: String(fields.get('type_piece')),
        ...(fields.get('year') ? { year: Number(fields.get('year')) } : {}),
      });
      setResult(JSON.stringify(response, null, 2));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Cotation indisponible.');
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="settings-card" aria-labelledby="hardware-diagnostics-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">TESTS MANUELS</span>
          <h2 id="hardware-diagnostics-title">Matériel et parcours</h2>
        </div>
      </header>
      <p className="settings-description">
        Vérifiez un composant précis ou un parcours complet avec les données de votre installation.
      </p>
      {isPreview && (
        <p className="settings-note">Mode aperçu · connectez l’API pour exécuter ces tests.</p>
      )}
      <div className="settings-subsection">
        <h3>Éclairage intérieur · Shelly</h3>
        <p className="settings-description">
          Consultez les mesures du relais ou commandez les lumières. Les commandes sont refusées
          pendant la réservation du tunnel.
        </p>
        <div className="settings-actions">
          {(['status', 'on', 'off'] as const).map((command) => (
            <button
              key={command}
              disabled={isPreview || !!busy}
              onClick={() => void interior(command)}
            >
              {command === 'status'
                ? 'Lire l’état'
                : command === 'on'
                  ? 'Allumer l’intérieur'
                  : 'Éteindre l’intérieur'}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-subsection">
        <h3>Cotation AutoEstimate</h3>
        <p className="settings-description">
          Utilisez des identifiants réels de votre catalogue. Ce test consulte un prix sans modifier
          de dossier.
        </p>
        <form onSubmit={(event) => void pricing(event)}>
          <div className="settings-fields">
            {(['marque_id', 'model_id', 'part_id'] as const).map((name, index) => (
              <label key={name}>
                {['ID marque', 'ID modèle', 'ID pièce'][index]}
                <input type="number" name={name} min="1" required />
              </label>
            ))}
            <label>
              Type de pièce
              <select name="type_piece" defaultValue="occasion">
                <option value="occasion">Occasion</option>
                <option value="original">Original</option>
                <option value="adaptable">Adaptable</option>
              </select>
            </label>
            <label>
              Année (facultative)
              <input type="number" name="year" min="1886" max="2100" />
            </label>
          </div>
          <button type="submit" disabled={isPreview || !!busy}>
            {busy === 'pricing' ? 'Requête en cours…' : 'Tester une cotation réelle'}
          </button>
        </form>
      </div>
      {result && (
        <pre className="settings-test-result" role="status">
          {result}
        </pre>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error}
        </p>
      )}
      <WorkflowDiagnosticTest />
    </section>
  );
}
