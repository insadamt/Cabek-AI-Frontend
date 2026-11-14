/**
 * Call the standalone lighting API without authentication headers.
 * Depends on the standalone lighting URL and development proxy.
 */
const lightsApiBaseUrl = (import.meta.env.VITE_LIGHTS_API_BASE_URL ?? 'http://127.0.0.1:8001')
  .trim()
  .replace(/\/+$/, '');

export type LightingCapabilities = {
  driver: string;
  can_preview: boolean;
  simulated: boolean;
  supports_progressive_effects: boolean;
  supports_smooth_transitions: boolean;
  pixel_count: number | null;
};
export type LightingStatus = {
  state: string;
  active_effect: string | null;
  connection_status: string;
  synchronized: boolean;
  brightness: number;
  rgb: number[];
  ready: boolean;
  preview_active: boolean;
  active_capture_id: string | null;
  last_error: string | null;
  simulated: boolean;
  pixels: number[][] | null;
};
export type LightingEffect = {
  effect: string;
  supported: boolean;
  parameters: Record<string, { default?: unknown; minimum?: number; maximum?: number }>;
};
export type LightingSession = {
  status: LightingStatus;
  capabilities: LightingCapabilities;
  effects: LightingEffect[];
};

export async function lightingRequest<T>(
  path: string,
  payload?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(
    `${import.meta.env.DEV ? '' : lightsApiBaseUrl}/api/v1/lights${path}`,
    {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? `Erreur ${response.status}`);
  return result as T;
}

export async function loadLightingSession(signal?: AbortSignal): Promise<LightingSession> {
  const [status, capabilities, effects] = await Promise.all([
    lightingRequest<LightingStatus>('/status', undefined, signal),
    lightingRequest<LightingCapabilities>('/capabilities', undefined, signal),
    lightingRequest<LightingEffect[]>('/effects', undefined, signal),
  ]);
  return { status, capabilities, effects };
}

export function previewPayload(
  effect: LightingEffect,
  color: string,
  brightness: number,
  duration: number,
) {
  const params = effect.parameters;
  return {
    effect: effect.effect,
    ...('color' in params ? { color } : {}),
    ...('brightness' in params ? { brightness } : {}),
    ...('min_brightness' in params ? { min_brightness: Math.min(5, brightness) } : {}),
    ...('duration_ms' in params ? { duration_ms: duration } : {}),
    ...('repeat' in params ? { repeat: true } : {}),
  };
}
