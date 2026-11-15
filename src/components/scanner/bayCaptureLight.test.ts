/** Check RGB continuity, scan direction and capture deadlines using the actual frame sampler and sweep meshes. */
import { expect, it } from 'vitest';
import { createCapturePresentation, sampleCaptureLight } from './bayCaptureLight';
import { createBayCaptureSweep } from './bayCaptureSweep';
import { defaultBayVisualSettings as settings } from './bayControls';

it('holds green for ten seconds from witnessed completion, including after tab suspension', () => {
  const light = { status: 'completed', changedAt: 40_000 } as const;
  expect(sampleCaptureLight(light, 40_100)).toMatchObject({ color: '#00ff49', wakeIn: 9900 });
  expect(sampleCaptureLight(light, 49_999).color).toBe('#00ff49');
  expect(sampleCaptureLight(light, 50_000)).toMatchObject({ color: '#ffffff', wakeIn: undefined });
  expect(sampleCaptureLight({ status: 'completed' }, 99_999).color).toBe('#ffffff');
});

it('continues an interrupted color fade from the displayed color and brightness', () => {
  const present = createCapturePresentation();
  present({ status: 'not_started' }, 0, 0, false, settings);
  const mid = present({ status: 'capturing' }, 220, 0.22, false, settings).color.clone();
  expect(mid.g).toBeGreaterThan(0);
  expect(mid.g).toBeLessThan(1);
  const interrupted = present({ status: 'failed' }, 220, 0, false, settings);
  expect(interrupted.color.equals(mid)).toBe(true);
  expect(present({ status: 'failed' }, 800, 0.58, false, settings).color.getHexString()).toBe(
    'ff9800',
  );
  const dim = present({ status: 'failed' }, 1000, 0.2, false, {
    ...settings,
    exteriorBrightness: 0,
  });
  expect(dim.brightness).toBeGreaterThan(0);
  expect(dim.brightness).toBeLessThan(1);
  expect(present({ status: 'failed' }, 1000, 0, false, settings).brightness).toBe(dim.brightness);
});

it('keeps the sweep phase through duplicate polls and fades away at its last end of travel', () => {
  const present = createCapturePresentation();
  const sweep = createBayCaptureSweep();
  const capture = { status: 'capturing' } as const;
  present({ status: 'not_started' }, 0, 0, false, settings);
  for (const [time, depth] of [
    [1.8, -2.5],
    [3.6, 2.5],
  ]) {
    const frame = present(capture, time * 1000, 1.8, false, settings);
    sweep.update(frame);
    expect(sweep.root.visible).toBe(true);
    expect(sweep.root.position.z).toBeCloseTo(depth);
    expect(frame.animate).toBe(true);
  }
  const stop = { status: 'completed', changedAt: 3600 } as const;
  const fading = present(stop, 3760, 0.16, false, settings);
  expect(fading.sweepOpacity).toBeCloseTo(0.5);
  sweep.update(present(stop, 4200, 0.44, false, settings));
  expect(sweep.root.visible).toBe(false);
  const steady = present(capture, 4300, 0.1, true, settings);
  sweep.update(steady);
  expect(sweep.root.position.z).toBe(0);
  expect(sweep.root.children[0].visible).toBe(false);
  expect(steady.animate).toBe(false);
  sweep.dispose();
});
