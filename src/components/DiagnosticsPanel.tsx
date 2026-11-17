/** Present independent component checks and truthful hardware verification levels.
 * Depends on cached backend diagnostics and explicit browser checks; mount runs no tests. */
import { useEffect, useState } from 'react';
import { isPreview } from '../lib/api';
import {
  readDiagnostics,
  runDiagnostics,
  runBrowserChecks,
  type CheckResult,
  type DiagnosticSnapshot,
} from '../lib/diagnosticsApi';

const statusLabels: Record<CheckResult['status'], string> = {
  ok: 'Disponible',
  warning: 'À vérifier',
  error: 'Erreur',
  disabled: 'Désactivé',
  not_tested: 'Non testé',
};

export function DiagnosticsPanel({
  onSnapshot,
}: {
  onSnapshot: (value: DiagnosticSnapshot) => void;
}) {
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const [browser, setBrowser] = useState<CheckResult[]>(() =>
    [
      ['browser', 'Navigateur et connexion'],
      ['assets', 'Ressources de l’interface'],
      ['webgl', 'Affichage 3D · WebGL'],
    ].map(([id, label]) => ({
      id,
      label,
      status: 'not_tested',
      message: 'Test non exécuté.',
      checked_at: null,
      duration_ms: null,
      action: 'Lancez le contrôle du navigateur.',
    })),
  );
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  function accept(value: DiagnosticSnapshot) {
    setSnapshot(value);
    onSnapshot(value);
  }
  useEffect(() => {
    if (isPreview) return;
    let active = true;
    const refresh = () =>
      readDiagnostics()
        .then((value) => {
          if (active) {
            accept(value);
            setError('');
          }
        })
        .catch((failure: Error) => {
          if (active) setError(failure.message);
        });
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
  async function run(id?: string) {
    if (busy) return;
    setBusy(id ?? 'all');
    setError('');
    if (!id || ['browser', 'assets', 'webgl'].includes(id)) setBrowser(runBrowserChecks());
    try {
      if (!isPreview && (!id || !['browser', 'assets', 'webgl'].includes(id)))
        accept(await runDiagnostics(id ? [id] : undefined));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Diagnostic indisponible.');
    } finally {
      setBusy('');
    }
  }
  const checks = [...browser, ...(snapshot?.checks ?? [])];
  return (
    <section className="settings-card" aria-labelledby="diagnostics-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">ÉTAT DE L’APPLICATION</span>
          <h2 id="diagnostics-title">Diagnostics</h2>
        </div>
        <button className="settings-primary" disabled={!!busy} onClick={() => void run()}>
          {busy === 'all' ? 'Tests en cours…' : 'Tout tester'}
        </button>
      </header>
      <p className="settings-description">
        Vérifiez les connexions, les modèles, le stockage et les services. Ces contrôles ne
        commutent aucune lumière et ne lancent aucune capture ni analyse IA.
      </p>
      {isPreview && (
        <p className="settings-note">
          Mode aperçu · seuls les contrôles du navigateur sont disponibles.
        </p>
      )}
      {snapshot?.reservation && (
        <p className="settings-reservation" role="status">
          Tunnel réservé · {snapshot.reservation.dossier_id} ·{' '}
          {snapshot.reservation.run_id
            ? 'Analyse IA en cours'
            : 'Capture ou préparation de l’analyse'}
        </p>
      )}
      {snapshot && (
        <p className="settings-note">
          Source de capture :{' '}
          {snapshot.capture_provider === 'mock'
            ? 'simulée (photographies locales)'
            : snapshot.capture_provider === 'disabled'
              ? 'désactivée'
              : snapshot.capture_provider}
          .
        </p>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error}
        </p>
      )}
      <div className="diagnostic-checks">
        {checks.map((check) => (
          <article className="diagnostic-check" key={check.id}>
            <div className="diagnostic-check-heading">
              <h3>{check.label}</h3>
              <span className={`diagnostic-badge is-${check.status}`}>
                {statusLabels[check.status]}
              </span>
            </div>
            <p>{check.message}</p>
            {check.status !== 'ok' && <p className="settings-note">{check.action}</p>}
            {check.code && <code>{check.code}</code>}
            {check.details && (
              <details>
                <summary>Détails</summary>
                <pre>{JSON.stringify(check.details, null, 2)}</pre>
              </details>
            )}
            <footer>
              <small>
                {check.checked_at
                  ? `${new Date(check.checked_at).toLocaleString('fr-FR')} · ${check.duration_ms} ms`
                  : 'Aucun contrôle effectué'}
              </small>
              <button disabled={!!busy} onClick={() => void run(check.id)}>
                {busy === check.id ? 'Test…' : 'Tester'}
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!checks.length && (
        <p className="settings-note">
          Lancez « Tout tester » pour vérifier les composants disponibles.
        </p>
      )}
    </section>
  );
}
