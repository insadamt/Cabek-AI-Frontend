/** Checks actual Three.js capture geometry and cleanup without a browser or GPU; depends on runtime frame DTOs. */
import { describe, expect, it, vi } from 'vitest';
import { createBayCaptureSweep } from './bayCaptureSweep';

describe('capture sweep', () => {
  it('moves through the parked vehicle only during real capture', () => {
    const sweep = createBayCaptureSweep();
    const frame = { capturing: false, elapsedSeconds: 0, reducedMotion: false };
    sweep.update(frame);
    expect(sweep.root.visible).toBe(false);
    sweep.update({ ...frame, capturing: true });
    const start = sweep.root.position.z;
    expect(sweep.root.visible).toBe(true);
    sweep.update({ ...frame, capturing: true, elapsedSeconds: 1.8 });
    expect(start).toBe(2.5);
    expect(sweep.root.position.z).toBe(-2.5);
    sweep.update(frame);
    expect(sweep.root.visible).toBe(false);
    sweep.dispose();
  });
  it('uses static lighting and no translucent sweep for reduced motion', () => {
    const sweep = createBayCaptureSweep();
    sweep.update({ capturing: true, elapsedSeconds: 0, reducedMotion: true });
    const position = sweep.root.position.clone();
    sweep.update({ capturing: true, elapsedSeconds: 50, reducedMotion: true });
    expect(sweep.root.position.equals(position)).toBe(true);
    expect(sweep.root.children[0].visible).toBe(false);
    expect(sweep.root.visible).toBe(true);
    sweep.dispose();
  });
  it('disposes owned resources once and ignores late updates', () => {
    const sweep = createBayCaptureSweep();
    const mesh = sweep.root.children[0] as import('three').Mesh;
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    sweep.dispose();
    sweep.dispose();
    sweep.update({ capturing: true, elapsedSeconds: 1, reducedMotion: false });
    expect(dispose).toHaveBeenCalledOnce();
    expect(sweep.root.visible).toBe(false);
  });
});
