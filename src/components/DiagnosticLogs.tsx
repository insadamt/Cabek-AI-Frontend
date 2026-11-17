/** Browse persistent server and browser logs, retaining offline troubleshooting.
 * Depends on bounded log APIs and browser history; export contains redacted visible entries. */
import { useEffect, useRef, useState } from 'react';
import { isPreview } from '../lib/api';
import { browserLogs, redactLog, type LogEntry } from '../lib/browserLogs';
import { readLogs, type DiagnosticSnapshot, type LogFilters } from '../lib/diagnosticsApi';

function matches(entry: LogEntry, filters: LogFilters) {
  return (
    (!filters.level || entry.level === filters.level) &&
    (!filters.component || entry.component.includes(filters.component)) &&
    (!filters.dossier_id || entry.dossier_id === filters.dossier_id) &&
    (!filters.run_id || entry.run_id === filters.run_id) &&
    (!filters.since || entry.timestamp >= filters.since) &&
    (!filters.until || entry.timestamp <= filters.until) &&
    (!filters.query ||
      JSON.stringify(entry).toLocaleLowerCase().includes(filters.query.toLocaleLowerCase()))
  );
}

export function DiagnosticLogs({ snapshot }: { snapshot: DiagnosticSnapshot | null }) {
  const [filters, setFilters] = useState<LogFilters>({ source: 'all' });
  const [entries, setEntries] = useState<LogEntry[]>(() => browserLogs().read());
  const [cursor, setCursor] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [diskAvailable, setDiskAvailable] = useState(true);
  const sequence = useRef(0);

  async function refresh(older = false) {
    const request = ++sequence.current;
    setBusy(true);
    let fetched: LogEntry[] = [];
    let next: string | null = null;
    let failure = '';
    try {
      if (!isPreview && filters.source !== 'browser') {
        if (filters.source === 'worker' && !filters.dossier_id)
          throw new Error('Indiquez un dossier pour lire son journal worker.');
        const page = await readLogs(
          { ...filters, source: filters.source === 'worker' ? 'worker' : 'backend' },
          older ? (cursor ?? undefined) : undefined,
        );
        fetched = page.entries;
        next = page.next_cursor;
        if (request === sequence.current) setDiskAvailable(page.disk_available);
      }
    } catch (reason) {
      failure = reason instanceof Error ? reason.message : 'Journaux serveur indisponibles.';
    }
    if (request !== sequence.current) return;
    const local =
      !filters.source || ['all', 'browser'].includes(filters.source)
        ? browserLogs()
            .read()
            .filter((entry) => matches(entry, filters))
        : [];
    setEntries((previous) => {
      const unique = new Map(
        [...local, ...fetched, ...(older ? previous : [])].map((entry) => [entry.id, entry]),
      );
      return [...unique.values()]
        .filter((entry) => matches(entry, filters))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 3000);
    });
    setError(failure);
    setCursor(next);
    setBusy(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 350);
    return () => {
      sequence.current++;
      window.clearTimeout(timer);
    };
  }, [filters]);
  useEffect(() => {
    const interval = autoRefresh ? window.setInterval(() => void refresh(), 5000) : undefined;
    return () => window.clearInterval(interval);
  }, [filters, autoRefresh]);
  function update(key: keyof LogFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  function exportLogs() {
    const content = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        diagnostics: snapshot,
        filters,
        entries,
        browser_history_persistent: browserLogs().persistent(),
      },
      (_key, value: unknown) => (typeof value === 'string' ? redactLog(value) : value),
      2,
    );
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cabek-diagnostics-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy(entry: LogEntry) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    } catch {
      setError('Copie indisponible dans ce navigateur. Utilisez l’export.');
    }
  }
  return (
    <section className="settings-card" aria-labelledby="diagnostic-logs-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">HISTORIQUE LOCAL</span>
          <h2 id="diagnostic-logs-title">Journaux et erreurs</h2>
        </div>
        <button onClick={exportLogs}>Exporter le diagnostic et les logs</button>
      </header>
      <p className="settings-description">
        Les événements sont enregistrés avant l’ouverture de cette page. L’export contient les
        entrées affichées ; chargez l’historique souhaité avant de l’exporter.
      </p>
      <div className="diagnostic-log-filters">
        <label>
          Source
          <select value={filters.source} onChange={(e) => update('source', e.target.value)}>
            <option value="all">Application + navigateur</option>
            <option value="backend">Serveur</option>
            <option value="browser">Navigateur</option>
            <option value="worker">Worker du dossier</option>
          </select>
        </label>
        <label>
          Niveau
          <select value={filters.level ?? ''} onChange={(e) => update('level', e.target.value)}>
            <option value="">Tous</option>
            {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label>
          Rechercher
          <input value={filters.query ?? ''} onChange={(e) => update('query', e.target.value)} />
        </label>
        <label>
          Composant
          <input
            value={filters.component ?? ''}
            onChange={(e) => update('component', e.target.value)}
            placeholder="api, scans, éclairage…"
          />
        </label>
        <label>
          Dossier
          <input
            value={filters.dossier_id ?? ''}
            onChange={(e) => update('dossier_id', e.target.value)}
          />
        </label>
        <label>
          Analyse / run
          <input value={filters.run_id ?? ''} onChange={(e) => update('run_id', e.target.value)} />
        </label>
        <label>
          Depuis
          <input
            type="datetime-local"
            onChange={(e) =>
              update('since', e.target.value ? new Date(e.target.value).toISOString() : '')
            }
          />
        </label>
        <label>
          Jusqu’à
          <input
            type="datetime-local"
            onChange={(e) =>
              update('until', e.target.value ? new Date(e.target.value).toISOString() : '')
            }
          />
        </label>
      </div>
      <div className="settings-actions">
        <button onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? 'Mettre en pause' : 'Reprendre l’actualisation'}
        </button>
        <button disabled={busy} onClick={() => void refresh()}>
          Actualiser
        </button>
        <span>{entries.length} événement(s)</span>
      </div>
      {(!browserLogs().persistent() || !diskAvailable) && (
        <p className="settings-note">
          Une partie des journaux est conservée en mémoire seulement : le stockage local est
          indisponible.
        </p>
      )}
      {error && (
        <p className="settings-feedback is-error" role="alert">
          {error} Les événements du navigateur restent disponibles.
        </p>
      )}
      <div className="diagnostic-log-list" aria-live="polite">
        {entries.map((entry) => (
          <article
            className={`diagnostic-log-entry is-${entry.level.toLowerCase()}`}
            key={entry.id}
          >
            <div>
              <time dateTime={entry.timestamp}>
                {new Date(entry.timestamp).toLocaleString('fr-FR')}
              </time>
              <strong>{entry.level}</strong>
              <span>
                {entry.source} · {entry.component}
              </span>
            </div>
            <p>{entry.message}</p>
            <small>
              {[entry.code, entry.dossier_id, entry.capture_id, entry.run_id, entry.request_id]
                .filter(Boolean)
                .join(' · ')}
            </small>
            <button aria-label="Copier cet événement" onClick={() => void copy(entry)}>
              Copier
            </button>
          </article>
        ))}
        {!entries.length && <p className="settings-note">Aucun événement pour ces filtres.</p>}
      </div>
      {cursor && (
        <button
          disabled={busy}
          onClick={() => {
            setAutoRefresh(false);
            void refresh(true);
          }}
        >
          Charger les événements précédents
        </button>
      )}
    </section>
  );
}
