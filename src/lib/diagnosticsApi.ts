/** Typed maintenance API and browser-only checks for the central settings hub.
 * Depends on existing settings transport; safe checks never invoke capture or AI. */
import { settingsRequest } from './settingsTransport';
import { recordBrowserLog, type LogEntry } from './browserLogs';
import { applicationAssetStatus } from './applicationAssets';
import { isPreview } from './api';

export type CheckResult = {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'disabled' | 'not_tested';
  message: string;
  action: string;
  checked_at: string | null;
  duration_ms: number | null;
  code?: string | null;
  details?: Record<string, unknown>;
};
export type DiagnosticSnapshot = {
  checks: CheckResult[];
  reservation: {
    dossier_id: string;
    capture_id: string;
    run_id: string | null;
    slow_mode: boolean;
  } | null;
  capture_provider: string;
  logs_persistent: boolean;
};
export type LogPage = { entries: LogEntry[]; next_cursor: string | null; disk_available: boolean };
export type LogFilters = {
  source?: string;
  level?: string;
  component?: string;
  query?: string;
  dossier_id?: string;
  run_id?: string;
  since?: string;
  until?: string;
};

export type OperationPreferences = { slow_mode: boolean; demo_mode: boolean };
export const readOperation = () => settingsRequest<OperationPreferences>('/operation');
export const saveOperation = (slow_mode: boolean) =>
  settingsRequest<OperationPreferences>('/operation', 'PATCH', { slow_mode });
export const saveDemoMode = (demo_mode: boolean) =>
  settingsRequest<OperationPreferences>('/operation', 'PATCH', { demo_mode });
export const readDiagnostics = () => settingsRequest<DiagnosticSnapshot>('/diagnostics');
export const runDiagnostics = (checks?: string[]) =>
  settingsRequest<DiagnosticSnapshot>('/diagnostics/run', 'POST', checks ? { checks } : {});
export function readLogs(filters: LogFilters, cursor?: string) {
  const params = new URLSearchParams({ limit: '200' });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (cursor) params.set('cursor', cursor);
  return settingsRequest<LogPage>(`/logs?${params}`);
}
export const testInterior = (command: 'status' | 'on' | 'off') =>
  settingsRequest<Record<string, unknown>>(
    `/internal-lights/${command}`,
    command === 'status' ? 'GET' : 'POST',
  );
export const testPricing = (payload: {
  marque_id: number;
  model_id: number;
  part_id: number;
  type_piece: string;
  year?: number;
}) =>
  settingsRequest<{ status: string; message: string; estimation: unknown }>(
    '/diagnostics/pricing',
    'POST',
    payload,
  );

export function runBrowserChecks(): CheckResult[] {
  const now = new Date().toISOString();
  const assets = applicationAssetStatus();
  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webgl = !!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* The result carries unsupported browser/GPU information. */
  }
  const checks: CheckResult[] = [
    {
      id: 'browser',
      label: 'Navigateur et connexion',
      status: navigator.onLine ? 'ok' : 'warning',
      message: `${navigator.onLine ? 'Navigateur connecté.' : 'Navigateur hors ligne.'} ${isPreview ? 'Mode aperçu : API non configurée.' : 'Connexion API vérifiée séparément.'}`,
    },
    {
      id: 'assets',
      label: 'Ressources de l’interface',
      status: assets.failed.length ? 'error' : assets.pending ? 'warning' : 'ok',
      message: `${assets.loaded} images préparées ; ${assets.failed.length} échec(s).${assets.pending ? ' Préparation en cours.' : ''}`,
      details: { failed: assets.failed },
    },
    {
      id: 'webgl',
      label: 'Affichage 3D · WebGL',
      status: webgl ? 'ok' : 'warning',
      message: webgl
        ? 'Contexte WebGL disponible.'
        : 'WebGL indisponible ; vérifiez le navigateur et le GPU.',
    },
  ].map(
    (item) =>
      ({
        ...item,
        checked_at: now,
        duration_ms: 0,
        action: 'Vérifiez le navigateur, les ressources et la connexion.',
      }) as CheckResult,
  );
  checks.forEach((item) =>
    recordBrowserLog('diagnostics.' + item.id, item.message, {
      level: item.status === 'error' ? 'ERROR' : 'INFO',
    }),
  );
  return checks;
}
