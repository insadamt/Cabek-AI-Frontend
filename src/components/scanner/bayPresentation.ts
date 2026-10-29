/**
 * Defines the continuous close-up, tunnel reveal and left-composed homepage camera poses.
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
const closeCamera = new Vector3(3.9, 1.65, 1.15);
const closeTarget = new Vector3(0, 0.85, 6.4);
const revealedCamera = new Vector3(11.8, 12.4, -17);
const revealedTarget = new Vector3(0, 0.85, 2.55);
const homepageCamera = new Vector3(9.2, 8, -11.6);
const homepageTarget = new Vector3(0, 0.95, 0);

export interface BayCameraMotion {
  revealProgress: number;
  reframeProgress: number;
}

export interface BayCameraViewport {
  width: number;
  height: number;
}

function resolveBayComposition(aspect: number, viewport?: BayCameraViewport) {
  const width = viewport?.width ?? aspect * 900;
  const height = viewport?.height ?? 900;
  const stackedPanels = viewport ? width <= 760 && (height > 560 || width <= 560) : aspect < 1;
  //
  // Match the selector's occupied space so short phones and narrow desktops keep clear controls.
  // Dimensions are sampled on resize; animated frames never measure the DOM.
  //
  if (stackedPanels) {
    return {
      stackedPanels,
      distance: Math.max(
        1.18,
        0.82 / Math.max(aspect, 0.3),
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
    distance: Math.max(1, (1.46 / aspect) * (0.7 / availableWidth)),
    horizontalShift: Math.max(0.17, 0.52 - availableWidth / 2),
    verticalShift: 0,
  };
}

// ============================================================
// Cinematic projection with an unchanged physical orbit target
// ============================================================

export function applyBayCameraFraming(
  camera: PerspectiveCamera,
  aspect: number,
  reframeProgress: number,
  viewport?: BayCameraViewport,
) {
  const composition = resolveBayComposition(aspect, viewport);
  const width = Math.max(aspect, 0.3) * 1000;

  //
  // An asymmetric frustum reserves UI space without moving the tunnel or orbit centre.
  //
  camera.setViewOffset(
    width,
    1000,
    width * composition.horizontalShift * reframeProgress,
    1000 * composition.verticalShift * reframeProgress,
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
  const reveal = Math.min(1, Math.max(0, motion.revealProgress));
  const reframe = Math.min(1, Math.max(0, motion.reframeProgress));
  camera.position.lerpVectors(closeCamera, revealedCamera, reveal).lerp(homepageCamera, reframe);
  targetOut.lerpVectors(closeTarget, revealedTarget, reveal).lerp(homepageTarget, reframe);
  const composition = resolveBayComposition(aspect, viewport);
  camera.fov = composition.stackedPanels ? 44 + 10 * reveal * (1 - reframe) : 32;
  if (composition.stackedPanels) {
    camera.position.sub(targetOut).multiplyScalar(composition.distance).add(targetOut);
  } else {
    //
    // Near-square desktops need extra horizontal clearance for the same fixed-width workflow panels.
    // Apply it progressively so the close POV keeps its authored distance.
    //
    const desktopDistance = 1 + (composition.distance - 1) * reveal;
    camera.position.sub(targetOut).multiplyScalar(desktopDistance).add(targetOut);
  }
  applyBayCameraFraming(camera, aspect, reframe, viewport);
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
