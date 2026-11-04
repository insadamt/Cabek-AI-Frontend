/**
 * Centers the complete bay inside the scanner scene area above its operational controls.
 * Depends on baySubjectFraming, Three.js projection and exported wheel radii; legacy QA framing remains available.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { BayVehicle } from './bayVehicle';
import { fitBayCameraToSubject } from './baySubjectFraming';

export const vehicleApproachDistance = 7.2;
const arrivalCamera = new Vector3(4.5, 29, -5.5);
const parkedCamera = new Vector3(8.5, 12, -11);
const arrivalTarget = new Vector3(0, 0.35, 3.0);
const parkedTarget = new Vector3(0, 0.75, 0);
const lookTarget = new Vector3();
const defaultWheelRadiusMetres = 0.33;
//
// A raised corner view exposes the vehicle roof and both tunnel sensor arrays without changing their alignment.
// This endpoint is shared by completion, skip, reduced motion and camera reset.
//
const homepageCamera = new Vector3(6.8, 7.4, -10.4);
const homepageTarget = new Vector3(0, 0.6, 0);

export interface BayCameraMotion {
  entryProgress?: number;
  revealProgress: number;
  reframeProgress: number;
}

export interface BayCameraViewport {
  width: number;
  height: number;
}

function resolveBayComposition(aspect: number, viewport?: BayCameraViewport) {
  //
  // A cached scene can finish loading after its canvas is detached; zero-size DOM bounds must not corrupt projection.
  //
  const measuredViewport =
    viewport && viewport.width > 0 && viewport.height > 0 ? viewport : undefined;
  const width = measuredViewport?.width ?? aspect * 900;
  const height = measuredViewport?.height ?? 900;
  // The scene host now reserves navigation and controls in layout; projection no longer reserves a removed selector.
  const stackedPanels = width < height;
  return {
    stackedPanels,
    horizontalShift: 0,
    verticalShift: 0,
  };
}

// ============================================================
// Cinematic framing along the approach and parked target
// ============================================================

export function applyBayCameraFraming(
  camera: PerspectiveCamera,
  aspect: number,
  viewport?: BayCameraViewport,
) {
  const composition = resolveBayComposition(aspect, viewport);
  const width = Math.max(aspect, 0.3) * 1000;

  // Keep manual orbit and cinematic playback on the same centered projection.
  camera.setViewOffset(
    width,
    1000,
    width * composition.horizontalShift,
    1000 * composition.verticalShift,
    width,
    1000,
  );
}

export function applyCinematicBayCamera(
  camera: PerspectiveCamera,
  motion: BayCameraMotion,
  aspect: number,
  targetOut: Vector3,
  viewport?: BayCameraViewport,
) {
  const reframe = Math.min(1, Math.max(0, motion.reframeProgress));
  const entry = Math.min(1, Math.max(0, motion.entryProgress ?? 1));
  // Frame the approach lane as well as the tunnel, then follow the same car into its final position.
  targetOut.set(0, 1.1, 3.3).lerp(homepageTarget, entry);
  camera.position.set(14, 4, -4).lerp(homepageCamera, entry);
  const composition = resolveBayComposition(aspect, viewport);
  camera.fov = composition.stackedPanels ? 44 : 32;
  //
  // Keep the opening near its final size so the scene is prominent throughout the car's entrance.
  //
  fitBayCameraToSubject(camera, targetOut, entry, aspect);
  const entranceDistance = 1 + 0.025 * (1 - reframe);
  camera.position.sub(targetOut).multiplyScalar(entranceDistance).add(targetOut);
  applyBayCameraFraming(camera, aspect, viewport);
  camera.lookAt(targetOut);
  camera.updateMatrixWorld();
}

// ============================================================
// Legacy export framing and deterministic vehicle travel
// ============================================================

export function applyBayCamera(camera: PerspectiveCamera, progress: number, aspect: number) {
  camera.position.lerpVectors(arrivalCamera, parkedCamera, progress);
  lookTarget.lerpVectors(arrivalTarget, parkedTarget, progress);
  if (aspect < 1) {
    // The complete canopy and control pedestal need horizontal clearance on narrow screens.

    camera.position.x *= 0.45;
    const framing = Math.max(1, 0.75 / Math.max(aspect, 0.3));
    camera.position
      .sub(lookTarget)
      .multiplyScalar(framing * 1.2)
      .add(lookTarget);
  }
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld();
}

export function applyBayVehicle(vehicle: BayVehicle, progress: number) {
  vehicle.root.position.z = vehicleApproachDistance * (1 - progress);
  const travelled = vehicleApproachDistance * progress;
  for (const wheel of vehicle.wheels) {
    if (wheel.userData.bayInitialRotationX === undefined)
      wheel.userData.bayInitialRotationX = wheel.rotation.x;
    const authoredRadius = wheel.userData.wheel_radius_metres;
    const radius =
      typeof authoredRadius === 'number' && Number.isFinite(authoredRadius) && authoredRadius > 0
        ? authoredRadius
        : defaultWheelRadiusMetres;
    wheel.rotation.x = wheel.userData.bayInitialRotationX - travelled / radius;
  }
}
