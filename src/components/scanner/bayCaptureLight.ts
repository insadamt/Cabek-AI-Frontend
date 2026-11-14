/** Sample the single-zone exterior strip from confirmed capture status.
 * Depends on capture transition timestamps. Decay can only follow a confirmed completion.
 */
import type { CaptureStatus } from '../../captureTypes';

export interface BayCaptureLight {
  status: CaptureStatus['status'];
  changedAt?: number;
}

export const standbyLight: BayCaptureLight = { status: 'not_started' };
export const successHoldMs = 10_000;

export function sampleCaptureLight(light: BayCaptureLight, now: number, reducedMotion: boolean) {
  const elapsed = light.changedAt === undefined ? Infinity : Math.max(0, now - light.changedAt);
  const success = light.status === 'completed' && elapsed < successHoldMs;
  const warning = light.status === 'failed';
  const animate = !reducedMotion && (success || warning) && elapsed < 1000;
  const brightness = animate ? 1 - 0.38 * Math.sin((elapsed / 1000) * Math.PI * 2) ** 2 : 1;
  return {
    color: success
      ? '#00ff49'
      : warning
        ? '#ff9800'
        : light.status === 'capturing'
          ? '#ff0000'
          : '#ffffff',
    brightness,
    standby: light.status === 'not_started',
    animate,
    // A single wake-up restores white even when the browser has stopped rendering idle frames.
    wakeIn: success ? successHoldMs - elapsed : undefined,
  };
}
