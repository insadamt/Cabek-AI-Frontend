/**
 * Guards the larger, more frontal car view and always-visible selector clearance during playback.
 * Depends on Three.js CPU matrices, bayGeometry and bayPresentation; requires no GPU or browser automation.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { buildScanningBay } from './bayGeometry';
import { applyCinematicBayCamera, vehicleApproachDistance } from './bayPresentation';

const bay = buildScanningBay();
const equipmentCorners: Vector3[] = [];
bay.root.updateMatrixWorld(true);
bay.root.traverse((object) => {
  if (!(object instanceof Mesh) || object.name === 'Studio floor') return;
  const bounds = new Box3().setFromObject(object);
  equipmentCorners.push(...boxCorners(bounds));
});
afterAll(() => bay.dispose());

function boxCorners(bounds: Box3) {
  const corners: Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z));
  return corners;
}

function vehicleCorners(entryProgress: number) {
  const centerZ = vehicleApproachDistance * (1 - entryProgress);
  return boxCorners(
    new Box3(new Vector3(-1.1, 0, centerZ - 2.4), new Vector3(1.1, 1.55, centerZ + 2.4)),
  );
}

function projectComposition(
  width: number,
  height: number,
  entryProgress = 1,
  reframeProgress = 1,
  revealProgress = 1,
) {
  const camera = new PerspectiveCamera(32, width / height, 0.1, 120);
  const target = new Vector3();
  applyCinematicBayCamera(camera, { revealProgress, reframeProgress }, camera.aspect, target, {
    width,
    height,
  });
  const projected = [...equipmentCorners, ...vehicleCorners(entryProgress)].map((point) =>
    point.clone().project(camera),
  );
  return {
    camera,
    target,
    left: (Math.min(...projected.map((point) => point.x)) + 1) / 2,
    right: (Math.max(...projected.map((point) => point.x)) + 1) / 2,
    top: (1 - Math.max(...projected.map((point) => point.y))) / 2,
    bottom: (1 - Math.min(...projected.map((point) => point.y))) / 2,
    projected,
  };
}

// ============================================================
// Desktop prominence and physical equipment clearance
// ============================================================

describe('premium homepage composition', () => {
  it('retains a finite camera while cached preparation finishes on a detached canvas', () => {
    const camera = new PerspectiveCamera(32, 1, 0.1, 120);
    const target = new Vector3();
    applyCinematicBayCamera(camera, { revealProgress: 1, reframeProgress: 1 }, 1, target, {
      width: 0,
      height: 0,
    });
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
  });

  it.each([
    [1920, 1080],
    [1024, 768],
    [390, 690],
    [320, 690],
    [700, 500],
    [390, 480],
  ])(
    'keeps the car and tunnel clear of visible categories throughout entry at %i×%i',
    (width, height) => {
      for (const [entry, reframe, reveal] of [
        [0, 0, 0],
        [0.5, 0.15, 1],
        [0.9, 0.65, 1],
      ]) {
        const pose = projectComposition(width, height, entry, reframe, reveal);
        if (width <= 560) {
          expect(pose.bottom * height).toBeLessThan(height - 270);
        } else {
          const panelWidth = Math.min(336, Math.max(284, width * 0.23));
          const panelRight = height <= 560 ? 20 : Math.min(64, Math.max(28, width * 0.034));
          expect(pose.right * width).toBeLessThan(width - panelWidth - panelRight - 8);
        }
        for (const point of pose.projected) {
          expect(Math.abs(point.x)).toBeLessThan(1);
          expect(Math.abs(point.y)).toBeLessThan(1);
          expect(Math.abs(point.z)).toBeLessThan(1);
        }
      }
    },
  );

  it.each([
    [1862, 956],
    [1920, 1080],
    [1440, 900],
    [1280, 800],
  ])(
    'fills 75–88 percent height on a %i×%i desktop with clear workflow panels',
    (width, height) => {
      const pose = projectComposition(width, height);
      const visibleHeight = pose.bottom - pose.top;
      const panelWidth = Math.min(336, Math.max(284, width * 0.23));
      const panelRight = Math.min(64, Math.max(28, width * 0.034));
      expect(visibleHeight).toBeGreaterThanOrEqual(0.75);
      expect(visibleHeight).toBeLessThanOrEqual(0.88);
      expect(pose.left).toBeGreaterThan(0.015);
      expect(pose.right * width).toBeLessThan(width - panelWidth - panelRight - 16);
      expect(pose.top * height).toBeGreaterThan(65);
      expect(pose.bottom).toBeLessThan(0.95);
      const elevation = Math.atan2(
        pose.camera.position.y - pose.target.y,
        Math.hypot(pose.camera.position.x, pose.camera.position.z),
      );
      expect(elevation).toBeGreaterThan(0.28);
      expect(elevation).toBeLessThan(0.4);
      const frontAngle = Math.atan2(pose.camera.position.x, -pose.camera.position.z);
      expect(frontAngle).toBeGreaterThan(0.35);
      expect(frontAngle).toBeLessThan(0.45);
      expect(pose.camera.scale.toArray()).toEqual([1, 1, 1]);
    },
  );

  it('leaves the right panels clear at a smaller 1024×768 desktop', () => {
    const pose = projectComposition(1024, 768);
    expect(pose.left).toBeGreaterThan(0.02);
    expect(pose.right * 1024).toBeLessThan(1024 - 284 - 35 - 8);
    expect(pose.bottom - pose.top).toBeGreaterThan(0.34);
  });

  it('enlarges the desktop equipment while keeping it in the left side', () => {
    const pose = projectComposition(1862, 956);
    expect(pose.left).toBeCloseTo(0.05, 1);
    expect(pose.right).toBeCloseTo(0.67, 1);
    expect(pose.top).toBeCloseTo(0.09, 1);
    expect(pose.bottom).toBeCloseTo(0.94, 1);
  });

  it('reserves the compact right selector in short 700×500 landscape', () => {
    const pose = projectComposition(700, 500);
    expect(pose.left).toBeGreaterThan(0.01);
    expect(pose.right * 700).toBeLessThan(700 - 284 - 20 - 8);
    expect(pose.top * 500).toBeGreaterThan(65);
    expect(pose.bottom).toBeLessThan(0.95);
  });

  it.each([
    [760, 900],
    [390, 690],
    [320, 690],
    [650, 600],
    [390, 480],
  ])(
    'keeps the parked car and console above the stacked phone panels at %i×%i',
    (width, height) => {
      const pose = projectComposition(width, height);
      expect(pose.left).toBeGreaterThan(0.02);
      expect(pose.right).toBeLessThan(0.98);
      expect(pose.top * height).toBeGreaterThan(65);
      expect(pose.bottom * height).toBeLessThan(height - 270);
    },
  );

  it.each([
    [1920, 1080],
    [1440, 900],
    [1024, 768],
    [390, 690],
  ])('keeps the complete drive visible after the camera reveal at %i×%i', (width, height) => {
    for (const entryProgress of [0, 0.25, 0.5, 0.75, 1]) {
      const pose = projectComposition(width, height, entryProgress, 0);
      for (const point of pose.projected) {
        expect(Math.abs(point.x)).toBeLessThan(1);
        expect(Math.abs(point.y)).toBeLessThan(1);
        expect(Math.abs(point.z)).toBeLessThan(1);
      }
    }
  });
});
