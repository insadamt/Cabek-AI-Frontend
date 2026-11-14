/** Send direct lighting commands over the local proxy or configured service URL.
 * Depends on fetch and the two-route API; no lifecycle or hardware polling occurs. */
const lightsApiBaseUrl = (import.meta.env.VITE_LIGHTS_API_BASE_URL ?? 'http://127.0.0.1:8001')
  .trim()
  .replace(/\/+$/, '');

export const lightingEffects = [
  'solid', 'fade_in', 'fade_out', 'breathing', 'pulse', 'transition', 'color_cycle',
  'cyber_morph', 'system_awakening', 'target_lock', 'mission_complete', 'warning', 'shutdown',
] as const;
export type LightingEffect = (typeof lightingEffects)[number];
export type LightingPayload = {
  effect: LightingEffect;
  color?: string;
  brightness: number;
  duration_ms?: number;
  speed?: number;
  repeat?: boolean;
  colors?: string[];
  easing?: string;
};
export type LightingResult = {
  success: true;
  effect?: LightingEffect;
  status: 'active' | 'running' | 'off';
};

export async function lightingRequest(
  path: '/set' | '/off',
  payload?: LightingPayload,
): Promise<LightingResult> {
  const response = await fetch(
    `${import.meta.env.DEV ? '' : lightsApiBaseUrl}/api/lights${path}`,
    {
      method: 'POST',
      headers: payload === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? `Erreur ${response.status}`);
  return result as LightingResult;
}

export function effectPayload(
  effect: LightingEffect, color: string, brightness: number, duration: number,
  speed: number, repeat: boolean, easing: string, palette: string,
): LightingPayload {
  if (effect === 'solid') return { effect, color, brightness };
  const colors = palette.split(/[\s,;]+/).filter(Boolean);
  return {
    effect, color, brightness, duration_ms: duration, speed, repeat, easing,
    ...(['transition', 'color_cycle', 'cyber_morph'].includes(effect) && colors.length
      ? { colors } : {}),
  };
}
