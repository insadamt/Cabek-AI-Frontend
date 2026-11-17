/** Signal browser asset preparation through CABEK AI; hardware outages must not prevent app access.
 * Depends on the configured API URL and local-only lifecycle endpoints, never a direct USB service URL. */
import { apiBaseUrl, isPreview } from './api';

export async function signalApplicationLighting(phase: 'startup' | 'ready') {
  if (isPreview) return;
  try {
    await fetch(`${import.meta.env.DEV ? '' : apiBaseUrl}/api/settings/lights/${phase}`, {
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Optional hardware must not hold the loading screen when the backend or lighting service is offline.
  }
}
