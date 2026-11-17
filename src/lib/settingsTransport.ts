/** Send bounded local settings requests through CABEK AI and retain useful errors.
 * Depends on shared API configuration and browser diagnostics; records no request bodies. */
import { apiBaseUrl, isPreview } from './api';
import { recordBrowserLog } from './browserLogs';

export async function settingsRequest<T>(
  path: string,
  method = 'GET',
  payload?: unknown,
): Promise<T> {
  if (isPreview) throw new Error('Connectez CABEK AI pour tester le matériel.');
  let requestId: string | undefined;
  try {
    const response = await fetch(`${import.meta.env.DEV ? '' : apiBaseUrl}/api/settings${path}`, {
      method,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
      headers: payload === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    requestId = response.headers?.get('X-Request-ID') ?? undefined;
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Réponse de CABEK AI vide ou invalide (HTTP ${response.status}). Vérifiez que l’API est démarrée à l’adresse configurée.`,
      );
    }
    if (!response.ok)
      throw new Error(result?.error?.message ?? `Erreur CABEK AI ${response.status}`);
    return result as T;
  } catch (error) {
    recordBrowserLog('settings.api', error instanceof Error ? error.message : error, {
      code: path.split('?')[0],
      request_id: requestId,
    });
    throw error;
  }
}
