/**
 * Guards complete vehicle and tunnel projection inside the scene area reserved above capture controls.
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
  applyCinematicBayCamera(
    camera,
    { entryProgress, revealProgress, reframeProgress },
    camera.aspect,
    target,
    {
      width,
      height,
    },
  );
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
// Reserved scanner scene bounds and complete cinematic travel
// ============================================================

describe('scanner control-surface composition', () => {
  it('fills the wide scanner canvas with the waiting car and tunnel', () => {
    const pose = projectComposition(1644, 650, 0, 1);
    expect(pose.right - pose.left).toBeGreaterThan(0.7);
    expect(pose.bottom - pose.top).toBeGreaterThan(0.5);
    expect((pose.left + pose.right) / 2).toBeCloseTo(0.5, 1);
    expect((pose.top + pose.bottom) / 2).toBeCloseTo(0.5, 1);
  });

  it('retains finite projection while cached preparation finishes detached', () => {
    const pose = projectComposition(1, 1);
    expect(pose.camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
  });

  it.each([
    [1366, 768],
    [1600, 900],
    [1920, 1080],
    [1024, 768],
    [390, 844],
    [320, 690],
    [390, 480],
    [700, 500],
  ])(
    'keeps the entire drive and sensor equipment inside the reserved scene at %i×%i',
    (width, height) => {
      const mobile = width <= 650;
      const shortLandscape = height <= 550 && !mobile;
      const desktopSidebar = width >= 1100 && height >= 650;
      const sceneWidth = width - (desktopSidebar ? 400 : mobile ? 24 : shortLandscape ? 358 : 48);
      const sceneHeight = Math.max(
        180,
        height - (desktopSidebar ? 200 : mobile ? 464 : shortLandscape ? 176 : 386),
      );
      for (const [entry, reframe] of [
        [0, 0],
        [0.25, 0.1],
        [0.5, 0.3],
        [0.9, 0.7],
        [1, 1],
      ]) {
        const pose = projectComposition(sceneWidth, sceneHeight, entry, reframe);
        for (const point of pose.projected) {
          expect(Math.abs(point.x), 'horizontal clipping').toBeLessThan(0.99);
          expect(Math.abs(point.y), 'vertical clipping').toBeLessThan(0.99);
          expect(Math.abs(point.z), 'camera depth').toBeLessThan(1);
        }
        expect(pose.left).toBeGreaterThan(0.015);
        expect(pose.right).toBeLessThan(0.985);
      }
    },
  );

  it.each([
    [966, 568],
    [1200, 700],
    [1520, 880],
  ])(
    'keeps the parked subject prominent in a %i×%i scene without reserving a removed selector',
    (width, height) => {
      const pose = projectComposition(width, height);
      expect(pose.bottom - pose.top).toBeGreaterThan(0.65);
      expect(pose.bottom - pose.top).toBeLessThan(0.9);
      expect(pose.camera.view?.offsetX).toBe(0);
      expect(pose.camera.view?.offsetY).toBe(0);
      expect((pose.left + pose.right) / 2).toBeCloseTo(0.5, 1);
      expect((pose.top + pose.bottom) / 2).toBeCloseTo(0.5, 1);
      expect(pose.camera.scale.toArray()).toEqual([1, 1, 1]);
    },
  );
});
