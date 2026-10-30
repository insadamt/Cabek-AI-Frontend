/**
 * Keeps the enlarged bay left-aligned with a more frontal car view beside immediately visible categories.
 * Depends on Three.js projection/view offsets and exported wheel radii; legacy QA framing remains available.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { BayVehicle } from './bayVehicle';

export const vehicleApproachDistance = 7.2;
const arrivalCamera = new Vector3(4.5, 29, -5.5);
const parkedCamera = new Vector3(8.5, 12, -11);
const arrivalTarget = new Vector3(0, 0.35, 3.0);
const parkedTarget = new Vector3(0, 0.75, 0);
const lookTarget = new Vector3();
const defaultWheelRadiusMetres = 0.33;
//
// Moving closer and toward the car's forward axis makes its front prominent without turning it inside the tunnel.
// This endpoint is shared by completion, skip, reduced motion and camera reset.
//
const homepageCamera = new Vector3(4.3, 3.8, -9.5);
const homepageTarget = new Vector3(0, 0.6, 0);

export interface BayCameraMotion {
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
  const stackedPanels = measuredViewport
    ? width <= 760 && (height > 560 || width <= 560)
    : aspect < 1;
  //
  // Match the selector's occupied space so short phones and narrow desktops keep clear controls.
  // Dimensions are sampled on resize; animated frames never measure the DOM.
  //
  if (stackedPanels) {
    return {
      stackedPanels,
      distance: Math.max(
        1.18,
        0.94 / Math.max(aspect, 0.3),
        0.56 / Math.max(0.2, 1 - 360 / height),
      ),
      horizontalShift: 0,
      verticalShift: 100 / height,
    };
  }
  const panelWidth = Math.min(336, Math.max(284, width * 0.23));
  const panelRight = height <= 560 ? 20 : Math.min(64, Math.max(28, width * 0.034));
  const availableWidth = Math.max(0.25, (width - panelWidth - panelRight - 24) / width);
  return {
    stackedPanels,
    distance: Math.max(1, (1.8 / aspect) * (0.7 / availableWidth)),
    horizontalShift: Math.max(0.18, 0.52 - availableWidth / 2),
    verticalShift: 0.025,
  };
}

// ============================================================
// Cinematic projection with an unchanged physical orbit target
// ============================================================

export function applyBayCameraFraming(
  camera: PerspectiveCamera,
  aspect: number,
  viewport?: BayCameraViewport,
) {
  const composition = resolveBayComposition(aspect, viewport);
  const width = Math.max(aspect, 0.3) * 1000;

  //
  // Reserve the menu area from the first frame; animating this offset made the scene slide left after entry.
  //
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
  targetOut.copy(homepageTarget);
  camera.position.copy(homepageCamera);
  const composition = resolveBayComposition(aspect, viewport);
  camera.fov = composition.stackedPanels ? 44 : 32;
  //
  // Keep the opening near its final size so the scene is prominent throughout the car's entrance.
  //
  const entranceDistance = 1 + 0.04 * (1 - reframe);
  camera.position
    .sub(targetOut)
    .multiplyScalar(composition.distance * entranceDistance)
    .add(targetOut);
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
