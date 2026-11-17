/** Animate the four shared RGB fixtures and scan sweep from confirmed capture state.
 * Uses linear Three.js colors, visible frame time for motion and the store's completion deadline.
 */
import { Color, MathUtils } from 'three';
import type { CaptureStatus } from '../../captureTypes';
import type { BayVisualSettings } from './bayControls';

export interface BayCaptureLight {
  status: CaptureStatus['status'];
  changedAt?: number;
  sweeping?: boolean;
}

export const standbyLight: BayCaptureLight = { status: 'not_started' };
export const successHoldMs = 10_000;

export function sampleCaptureLight(light: BayCaptureLight, now: number) {
  const elapsed = light.changedAt === undefined ? Infinity : Math.max(0, now - light.changedAt);
  const success = light.status === 'completed' && elapsed < successHoldMs;
  return {
    color: success
      ? '#00ff49'
      : light.status === 'failed'
        ? '#ff9800'
        : light.status === 'capturing'
          ? '#ff0000'
          : '#ffffff',
    standby: light.status === 'not_started',
    wakeIn: success ? successHoldMs - elapsed : undefined,
  };
}

export function createCapturePresentation() {
  const color = new Color();
  const start = new Color();
  const target = new Color();
  let targetStyle: string | undefined;
  let fade = 1;
  let brightness = 1;
  let startBrightness = 1;
  let targetBrightness = 1;
  let sweepGain = 0;
  let sweepSeconds = 0;

  return (
    light: BayCaptureLight,
    now: number,
    delta: number,
    reduced: boolean,
    settings: BayVisualSettings,
  ) => {
    const cue = sampleCaptureLight(light, now);
    const style = cue.standby ? (settings.exteriorColor ?? cue.color) : cue.color;
    const intensity = settings.exteriorBrightness ?? 1;
    const capturing = light.status === 'capturing' && light.sweeping !== false;
    if (style !== targetStyle || intensity !== targetBrightness) {
      // Restart from the displayed mix so an interrupted fade never flashes its previous endpoint.
      start.copy(color);
      startBrightness = brightness;
      fade = targetStyle === undefined ? 1 : 0;
      targetStyle = style;
      target.set(style);
      targetBrightness = intensity;
    }
    fade = reduced ? 1 : Math.min(1, fade + delta / 0.55);
    const mix = MathUtils.smoothstep(fade, 0, 1);
    color.lerpColors(start, target, mix);
    brightness = MathUtils.lerp(startBrightness, targetBrightness, mix);
    sweepGain = reduced
      ? Number(capturing)
      : MathUtils.clamp(sweepGain + (capturing ? delta : -delta) / 0.32, 0, 1);
    if (sweepGain === 0) sweepSeconds = 0;
    else if (!reduced) sweepSeconds += delta;
    return {
      color,
      brightness,
      sweepOpacity: MathUtils.smoothstep(sweepGain, 0, 1),
      sweepDepth: reduced ? 0 : 2.5 * Math.cos((sweepSeconds * Math.PI) / 1.8),
      reduced,
      animate: !reduced && (fade < 1 || sweepGain > 0 || capturing),
      wakeIn: cue.wakeIn,
    };
  };
}

export type CapturePresentationFrame = ReturnType<ReturnType<typeof createCapturePresentation>>;
