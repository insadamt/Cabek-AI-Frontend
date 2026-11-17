/** Retain bounded browser diagnostics across reloads, including API outages.
 * Depends on optional localStorage; recording failures must never interrupt workflows. */
export type LogEntry = {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  component: string;
  message: string;
  code?: string;
  request_id?: string;
  dossier_id?: string;
  capture_id?: string;
  run_id?: string;
};
const storageKey = 'cabek.diagnostic-logs.v1';

export function redactLog(value: unknown) {
  return String(value)
    .replace(/(bearer\s+)[^\s"',;]+/gi, '$1[REDACTED]')
    .replace(
      /((?:token|password|secret|api[_-]?key|authorization)["']?\s*[:=]\s*["']?)[^\s"'&,;]+/gi,
      '$1[REDACTED]',
    )
    .replace(/(https?:\/\/)[^/\s@]+@/g, '$1[REDACTED]@')
    .slice(0, 4096);
}

export function createBrowserLogStore(storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  let entries: LogEntry[] = [];
  let persistent = !!storage;
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) ?? '[]');
    if (Array.isArray(saved))
      entries = saved
        .filter(
          (item): item is LogEntry =>
            item &&
            typeof item.id === 'string' &&
            typeof item.timestamp === 'string' &&
            typeof item.message === 'string' &&
            typeof item.component === 'string' &&
            typeof item.level === 'string' &&
            typeof item.source === 'string',
        )
        .slice(-1000)
        .map(
          (entry) =>
            Object.fromEntries(
              Object.entries(entry).map(([key, value]) => [
                key,
                typeof value === 'string' ? redactLog(value) : value,
              ]),
            ) as LogEntry,
        );
    while (new TextEncoder().encode(JSON.stringify(entries)).length > 1024 * 1024) entries.shift();
  } catch {
    persistent = false;
  }
  return {
    read: () => [...entries].reverse(),
    persistent: () => persistent,
    record(component: string, message: unknown, details: Partial<LogEntry> = {}) {
      const entry: LogEntry = {
        ...details,
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        level: details.level ?? 'ERROR',
        source: 'browser',
        component,
        message: redactLog(message),
      };
      for (const key of Object.keys(entry) as (keyof LogEntry)[]) {
        if (typeof entry[key] === 'string') entry[key] = redactLog(entry[key]);
      }
      entries.push(entry);
      entries = entries.slice(-1000);
      while (new TextEncoder().encode(JSON.stringify(entries)).length > 1024 * 1024)
        entries.shift();
      try {
        storage?.setItem(storageKey, JSON.stringify(entries));
      } catch {
        persistent = false;
      }
      return entry;
    },
  };
}

let store: ReturnType<typeof createBrowserLogStore> | undefined;
export function browserLogs() {
  if (!store) {
    let storage: Storage | undefined;
    try {
      if (typeof window !== 'undefined') storage = window.localStorage;
    } catch {
      /* Memory remains available. */
    }
    store = createBrowserLogStore(storage);
  }
  return store;
}

export function recordBrowserLog(component: string, message: unknown, details?: Partial<LogEntry>) {
  return browserLogs().record(component, message, details);
}

let installed = false;
export function installBrowserLogging() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  browserLogs();
  window.addEventListener(
    'error',
    (event) => {
      recordBrowserLog('browser.error', event.message || 'Échec du chargement d’une ressource.');
    },
    true,
  );
  window.addEventListener('unhandledrejection', (event) => {
    recordBrowserLog(
      'browser.promise',
      event.reason instanceof Error ? event.reason.message : event.reason,
    );
  });
  recordBrowserLog('application', 'Application démarrée', { level: 'INFO' });
}
