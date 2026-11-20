/** Release temporary maintenance effects when Settings closes.
 * Depends on the local backend guard; keepalive also covers browser departure. */
import { apiBaseUrl, isPreview } from './api';
import { recordBrowserLog } from './browserLogs';

export async function restoreSettingsDefaults() {
  if (isPreview) return;
  try {
    const response = await fetch(`${import.meta.env.DEV ? '' : apiBaseUrl}/api/settings/restore-defaults`, {
      method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', keepalive: true,
    });
    if (!response.ok) throw new Error(`Réinitialisation des tests impossible (HTTP ${response.status}).`);
  } catch (error) {
    recordBrowserLog('settings.restore', error instanceof Error ? error.message : error);
  }
}
