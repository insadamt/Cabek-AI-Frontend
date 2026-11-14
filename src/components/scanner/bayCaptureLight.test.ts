/** Protect the backend-driven single-zone sequence, its hold deadline and reduced-motion rendering. */
import { expect, it } from 'vitest';
import { sampleCaptureLight } from './bayCaptureLight';

it('only starts the green hold on witnessed completion, including after tab suspension', () => {
  const light = { status: 'completed', changedAt: 40_000 } as const;
  expect(sampleCaptureLight({ status: 'capturing' }, 99_999, false).color).toBe('#ff0000');
  expect(sampleCaptureLight(light, 40_100, false)).toMatchObject({
    color: '#00ff49',
    animate: true,
    wakeIn: 9900,
  });
  expect(sampleCaptureLight(light, 43_000, false)).toMatchObject({ animate: false, wakeIn: 7000 });
  expect(sampleCaptureLight(light, 49_999, true).color).toBe('#00ff49');
  expect(sampleCaptureLight(light, 50_000, false)).toMatchObject({
    color: '#ffffff',
    animate: false,
    wakeIn: undefined,
  });
  expect(sampleCaptureLight({ status: 'completed' }, 99_999, false).color).toBe('#ffffff');
  expect(sampleCaptureLight({ status: 'failed', changedAt: 42 }, 50, true)).toMatchObject({
    color: '#ff9800',
    animate: false,
  });
});
