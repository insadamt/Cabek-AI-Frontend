/** Send settings actions to CABEK AI using the existing application API address.
 * Depends on fetch and api.ts configuration; the browser never addresses the lighting service. */
import { settingsRequest } from './settingsTransport';

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
  'police',
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
  const result = await settingsRequest<Partial<LightTestResult>>(`/lights${path}`, 'POST', payload);
  if (result?.success !== true || !['active', 'running', 'off'].includes(result.status ?? ''))
    throw new Error('Réponse de CABEK AI invalide : la commande n’a pas été confirmée.');
  return result as LightTestResult;
}
