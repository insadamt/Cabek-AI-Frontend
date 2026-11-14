/** Send settings actions to CABEK AI using the existing application API address.
 * Depends on fetch and api.ts configuration; the browser never addresses the lighting service. */
import { apiBaseUrl, isPreview } from './api';

export const lightingEffects = [
  'solid',
  'fade_in',
  'fade_out',
  'breathing',
  'pulse',
  'transition',
  'color_cycle',
  'cyber_morph',
  'system_awakening',
  'target_lock',
  'mission_complete',
  'warning',
  'shutdown',
] as const;
export type LightingEffect = (typeof lightingEffects)[number];
export type LightTest = {
  effect: LightingEffect;
  color?: string;
  brightness?: number;
  duration_ms?: number;
  speed?: number;
  repeat?: boolean;
  easing?: string;
  colors?: string[];
};
export type LightTestResult = {
  success: true;
  effect?: LightingEffect;
  status: 'active' | 'running' | 'off';
};

export async function testLights(
  path: '/set' | '/off',
  payload?: LightTest,
): Promise<LightTestResult> {
  if (isPreview) throw new Error('Connectez CABEK AI pour tester le matériel.');
  const response = await fetch(
    `${import.meta.env.DEV ? '' : apiBaseUrl}/api/settings/lights${path}`,
    {
      method: 'POST',
      headers: payload === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? `Erreur ${response.status}`);
  return result;
}
