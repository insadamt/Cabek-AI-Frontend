/**
 * Protects real perspective framing and non-accumulating vehicle/wheel poses.
 * Projects metre-scaled sedan, canopy and control-screen bounds through actual Three.js camera matrices;
 * depends on bayPresentation and Three.js only, without a GPU or browser automation.
 */
import { describe, expect, it } from 'vitest';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { applyBayCamera, applyBayVehicle, vehicleApproachDistance } from './bayPresentation';
import type { BayVehicle } from './bayVehicle';

const viewports = [
  { name: '16:9 desktop', aspect: 16 / 9 },
  { name: '4:3 tablet', aspect: 4 / 3 },
  { name: '390×690 phone', aspect: 390 / 690 },
  { name: '320×690 phone', aspect: 320 / 690 },
];
const poses = [
  { name: 'outside', progress: 0 },
  { name: 'entering', progress: 0.5 },
  { name: 'parked', progress: 1 },
];

function createCamera(aspect: number) {
  return new PerspectiveCamera(32, aspect, 0.1, 120);
}

function carBounds(progress: number) {
  const centerZ = vehicleApproachDistance * (1 - progress);
  const corners: Vector3[] = [];
  for (const x of [-1.1, 1.1]) {
    for (const y of [0, 1.55]) {
      for (const z of [-2.4, 2.4]) corners.push(new Vector3(x, y, z + centerZ));
    }
  }
  return corners;
}

function tunnelBounds() {
  const corners: Vector3[] = [];
  for (const x of [-2.2, 2.2]) {
    for (const y of [-0.16, 3.25]) {
      for (const z of [-3.65, 3.65]) corners.push(new Vector3(x, y, z));
    }
  }
  corners.push(new Vector3(2.75, 1.7, 2.3), new Vector3(2.75, 0, 2.3));
  return corners;
}

function createVehicle(): BayVehicle {
  const root = new Group();
  const wheels = [0, 0.2, -0.3, 0.55].map((initialRotation, index) => {
    const wheel = new Group();
    wheel.name = `test-wheel-${index}`;
    wheel.rotation.x = initialRotation;
    root.add(wheel);
    return wheel;
  });
  return { root, wheels, dispose() {} };
}

// ============================================================
// Perspective projection and authored camera movement
// ============================================================

describe('real bay camera framing', () => {
  for (const viewport of viewports) {
    for (const pose of poses) {
      it(`keeps the complete ${pose.name} car and sensor canopy inside the ${viewport.name} frustum`, () => {
        const camera = createCamera(viewport.aspect);
        applyBayCamera(camera, pose.progress, viewport.aspect);
        for (const corner of [...carBounds(pose.progress), ...tunnelBounds()]) {
          const projected = corner.clone().project(camera);
          const diagnostic = `${viewport.name} ${pose.name}; world ${corner.toArray().join(', ')}; NDC ${projected
            .toArray()
            .map((value) => value.toFixed(6))
            .join(', ')}`;
          expect(Math.abs(projected.x), `${diagnostic}: horizontal framing`).toBeLessThanOrEqual(1);
          expect(Math.abs(projected.y), `${diagnostic}: vertical framing`).toBeLessThanOrEqual(1);
          expect(Math.abs(projected.z), `${diagnostic}: clipping depth`).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it('lowers and rotates a real perspective camera while retaining its native scale', () => {
    const camera = createCamera(16 / 9);
    applyBayCamera(camera, 0, camera.aspect);
    const arrivalPosition = camera.position.clone();
    const arrivalDirection = camera.getWorldDirection(new Vector3());
    const arrivalRotation = camera.quaternion.clone();
    applyBayCamera(camera, 1, camera.aspect);
    const parkedDirection = camera.getWorldDirection(new Vector3());
    expect(camera.isPerspectiveCamera).toBe(true);
    expect(arrivalPosition.y - camera.position.y).toBeGreaterThan(10);
    expect(arrivalDirection.angleTo(parkedDirection)).toBeGreaterThan(0.2);
    expect(arrivalRotation.angleTo(camera.quaternion)).toBeGreaterThan(0.2);
    expect(camera.position.distanceTo(arrivalPosition)).toBeGreaterThan(10);
    expect(camera.scale.toArray()).toEqual([1, 1, 1]);
  });
});

// ============================================================
// Deterministic metre-scaled vehicle and wheel poses
// ============================================================

describe('real bay vehicle posing', () => {
  it('moves the car from its approach position into the centre of the bay', () => {
    const vehicle = createVehicle();
    applyBayVehicle(vehicle, 0);
    expect(vehicle.root.position.z).toBe(7.2);
    applyBayVehicle(vehicle, 0.5);
    expect(vehicle.root.position.z).toBe(3.6);
    applyBayVehicle(vehicle, 1);
    expect(vehicle.root.position.toArray()).toEqual([0, 0, 0]);
  });

  it('uses exported wheel radius so the supplied sedan rolls without sliding', () => {
    const vehicle = createVehicle();
    vehicle.wheels.forEach((wheel, index) => {
      wheel.rotation.x = 0;
      wheel.userData.wheel_radius_metres = index % 2 ? 0.34 : 0.325;
    });
    applyBayVehicle(vehicle, 1);
    vehicle.wheels.forEach((wheel, index) => {
      expect(wheel.rotation.x).toBeCloseTo(-vehicleApproachDistance / (index % 2 ? 0.34 : 0.325));
    });
  });

  it('falls back to the sedan radius when exported metadata is invalid', () => {
    const vehicle = createVehicle();
    vehicle.wheels.forEach((wheel, index) => {
      wheel.rotation.x = 0;
      wheel.userData.wheel_radius_metres = [0, -1, Number.NaN, '0.33'][index];
    });
    applyBayVehicle(vehicle, 1);
    vehicle.wheels.forEach((wheel) => {
      expect(wheel.rotation.x).toBeCloseTo(-vehicleApproachDistance / 0.33);
    });
  });

  it('derives wheel rotation from the initial pose so repeated frames never accumulate rotation', () => {
    const vehicle = createVehicle();
    const initialRotations = vehicle.wheels.map((wheel) => wheel.rotation.x);
    applyBayVehicle(vehicle, 0.5);
    const halfwayRotations = vehicle.wheels.map((wheel) => wheel.rotation.x);
    for (let frame = 0; frame < 8; frame += 1) applyBayVehicle(vehicle, 0.5);
    expect(vehicle.wheels.map((wheel) => wheel.rotation.x)).toEqual(halfwayRotations);
    applyBayVehicle(vehicle, 1);
    const parkedRotations = vehicle.wheels.map((wheel) => wheel.rotation.x);
    parkedRotations.forEach((rotation, index) => {
      expect(rotation).toBeCloseTo(initialRotations[index] - 7.2 / 0.33);
    });
    for (let frame = 0; frame < 8; frame += 1) applyBayVehicle(vehicle, 1);
    expect(vehicle.wheels.map((wheel) => wheel.rotation.x)).toEqual(parkedRotations);
    expect(vehicle.root.position.z).toBe(0);
    applyBayVehicle(vehicle, 0);
    expect(vehicle.wheels.map((wheel) => wheel.rotation.x)).toEqual(initialRotations);
  });
});
