/**
 * Transfers the same camera between cinematic poses, damped exploration and interruptible presets.
 * Depends on Three.js OrbitControls, GSAP and bayPresentation; owns its listeners/tweens, never vehicle motion.
 */
import gsap from 'gsap';
import { MathUtils, PerspectiveCamera, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  applyBayCameraFraming,
  applyCinematicBayCamera,
  type BayCameraMotion,
} from './bayPresentation';

interface BayCameraControllerOptions {
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  onChange: () => void;
  onManualInteraction: () => void;
}

export const bayCameraLimits = {
  minimumDistance: 6.3,
  maximumDistance: 29,
  minimumPolarAngle: 0.28,
  maximumPolarAngle: 1.49,
  minimumHeight: 0.45,
} as const;

export function isBayCameraInsideStructure(position: Vector3) {
  return Math.abs(position.x) < 3.35 && position.y < 3.5 && position.z > -3.95 && position.z < 3.95;
}

// ============================================================
// Shared camera ownership and safe manual takeover
// ============================================================

export function createBayCameraController(options: BayCameraControllerOptions) {
  const { camera, canvas } = options;
  let viewport = canvas.getBoundingClientRect?.();
  const originalTouchAction = canvas.style.touchAction;
  const initialPosition = camera.position.clone();
  const initialRotation = camera.quaternion.clone();
  const orbitTarget = camera
    .getWorldDirection(new Vector3())
    .multiplyScalar(10)
    .add(camera.position);
  const controls = new OrbitControls(camera, canvas);
  camera.position.copy(initialPosition);
  camera.quaternion.copy(initialRotation);
  controls.target.copy(orbitTarget);
  controls.enablePan = false;
  controls.mouseButtons.MIDDLE = null;
  controls.mouseButtons.RIGHT = null;
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;
  controls.minDistance = bayCameraLimits.minimumDistance;
  controls.maxDistance = bayCameraLimits.maximumDistance;
  controls.minPolarAngle = bayCameraLimits.minimumPolarAngle;
  controls.maxPolarAngle = bayCameraLimits.maximumPolarAngle;
  controls.autoRotate = false;
  const safePosition = camera.position.clone();
  const zoomOffset = new Vector3();
  let manuallyAdjusted = false;
  let reducedMotion = false;
  let enabled = true;
  let visible = true;
  let disposed = false;
  let cinematic = true;
  let framingProgress = 0;
  let currentPreset = 0;
  let suppressControlChanges = false;
  let zoomDistance: number | undefined;
  let latestMotion: BayCameraMotion = { revealProgress: 0, reframeProgress: 0 };
  let transition: gsap.core.Tween | undefined;
  let finishTransition: (() => void) | undefined;

  function notifyChange() {
    if (!disposed && visible) options.onChange();
  }

  function stopTransition() {
    transition?.kill();
    transition = undefined;
    finishTransition = undefined;
  }

  function enforceClearance() {
    camera.position.y = Math.max(bayCameraLimits.minimumHeight, camera.position.y);

    //
    // A takeover may orbit the approach car; its target alone cannot protect the tunnel behind it.
    // Rejecting a colliding step preserves the last clear view instead of teleporting through a wall.
    //
    if (isBayCameraInsideStructure(camera.position)) camera.position.copy(safePosition);
    else safePosition.copy(camera.position);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
  }

  function handleControlChange() {
    if (cinematic || disposed || suppressControlChanges) return;
    enforceClearance();
    notifyChange();
  }

  function beginManualInteraction() {
    if (!enabled || !visible || disposed) return false;
    stopTransition();
    zoomDistance = undefined;
    manuallyAdjusted = true;
    cinematic = false;

    //
    // The owner must kill cinematic camera tweens before OrbitControls receives this event.
    // Keeping the exact current target avoids a rotation jump on the first drag.
    //
    options.onManualInteraction();
    controls.target.copy(orbitTarget);
    const distance = camera.position.distanceTo(controls.target);
    controls.minDistance = Math.min(bayCameraLimits.minimumDistance, distance);
    controls.maxDistance = Math.max(bayCameraLimits.maximumDistance, distance);
    notifyChange();
    return true;
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button === 0 || event.pointerType === 'touch') beginManualInteraction();
  }

  function handleWheel(event: WheelEvent) {
    const previousZoomDistance = zoomDistance;
    if (!beginManualInteraction()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1);
    const distance = previousZoomDistance ?? camera.position.distanceTo(controls.target);
    zoomDistance = MathUtils.clamp(
      distance * Math.exp(MathUtils.clamp(pixels, -240, 240) * 0.0018),
      controls.minDistance,
      controls.maxDistance,
    );
  }

  function clearOrbitMomentum() {
    const position = camera.position.clone();
    const rotation = camera.quaternion.clone();
    const damping = controls.enableDamping;
    suppressControlChanges = true;
    controls.enableDamping = false;
    controls.update(0);
    controls.enableDamping = damping;
    camera.position.copy(position);
    camera.quaternion.copy(rotation);
    suppressControlChanges = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || !enabled || !visible || disposed) return;
    if (event.key === 'Home') {
      event.preventDefault();
      options.onManualInteraction();
      manuallyAdjusted = false;
      moveToPreset(0, reducedMotion);
      return;
    }
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(event.key)
    )
      return;
    if (!beginManualInteraction()) return;
    event.preventDefault();
    clearOrbitMomentum();
    const orbit = new Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const step = event.shiftKey ? 0.12 : 0.06;
    if (event.key === 'ArrowLeft') orbit.theta -= step;
    if (event.key === 'ArrowRight') orbit.theta += step;
    if (event.key === 'ArrowUp') orbit.phi -= step;
    if (event.key === 'ArrowDown') orbit.phi += step;
    if (event.key === '+' || event.key === '=') orbit.radius *= 0.92;
    if (event.key === '-' || event.key === '_') orbit.radius /= 0.92;
    orbit.phi = MathUtils.clamp(orbit.phi, controls.minPolarAngle, controls.maxPolarAngle);
    orbit.radius = MathUtils.clamp(orbit.radius, controls.minDistance, controls.maxDistance);
    camera.position.setFromSpherical(orbit).add(controls.target);
    zoomDistance = undefined;
    enforceClearance();
    notifyChange();
  }

  controls.addEventListener('change', handleControlChange);
  canvas.addEventListener('pointerdown', handlePointerDown, { capture: true });
  canvas.addEventListener('wheel', handleWheel, { capture: true, passive: false });
  canvas.addEventListener('keydown', handleKeyDown);

  // ============================================================
  // Interruptible final-view presets and bounded idle rendering
  // ============================================================

  function moveToPreset(preset: number, immediate: boolean) {
    stopTransition();
    clearOrbitMomentum();
    cinematic = false;
    currentPreset = preset;
    zoomDistance = undefined;
    const destinationCamera = camera.clone();
    const destinationTarget = new Vector3();
    applyCinematicBayCamera(
      destinationCamera,
      { revealProgress: 1, reframeProgress: 1 },
      camera.aspect,
      destinationTarget,
      viewport,
    );
    const presetAngle = preset === 1 ? 0.045 : preset === 2 ? -0.035 : 0;
    destinationCamera.position
      .sub(destinationTarget)
      .applyAxisAngle(camera.up, presetAngle)
      .add(destinationTarget);
    const startTarget = controls.target.clone();
    const startOrbit = new Spherical().setFromVector3(camera.position.clone().sub(startTarget));
    const destinationOrbit = new Spherical().setFromVector3(
      destinationCamera.position.clone().sub(destinationTarget),
    );
    const angleDifference = destinationOrbit.theta - startOrbit.theta;
    const shortestAngle = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));
    const transitionOrbit = new Spherical();
    const startFraming = framingProgress;
    const startFov = camera.fov;
    const tweenState = { progress: 0 };

    function applyTransitionPose() {
      controls.target.lerpVectors(startTarget, destinationTarget, tweenState.progress);
      //
      // Orbit around the equipment during reset; a straight chord can pass through its roof and pillars.
      //
      transitionOrbit.set(
        MathUtils.lerp(startOrbit.radius, destinationOrbit.radius, tweenState.progress),
        MathUtils.lerp(startOrbit.phi, destinationOrbit.phi, tweenState.progress),
        startOrbit.theta + shortestAngle * tweenState.progress,
      );
      camera.position.setFromSpherical(transitionOrbit).add(controls.target);
      orbitTarget.copy(controls.target);
      framingProgress = MathUtils.lerp(startFraming, 1, tweenState.progress);
      camera.fov = MathUtils.lerp(startFov, destinationCamera.fov, tweenState.progress);
      applyBayCameraFraming(camera, camera.aspect, framingProgress, viewport);
      enforceClearance();
      notifyChange();
    }

    finishTransition = () => {
      tweenState.progress = 1;
      applyTransitionPose();
      transition = undefined;
      finishTransition = undefined;
    };
    if (immediate) {
      finishTransition();
      return;
    }
    transition = gsap.to(tweenState, {
      progress: 1,
      duration: 1.05,
      ease: 'power2.inOut',
      paused: !visible,
      onUpdate: applyTransitionPose,
      onComplete: () => {
        transition = undefined;
        finishTransition = undefined;
      },
    });
  }

  return {
    applyCinematic(motion: BayCameraMotion) {
      if (disposed || manuallyAdjusted) return;
      stopTransition();
      cinematic = true;
      latestMotion = { ...motion };
      framingProgress = motion.reframeProgress;
      applyCinematicBayCamera(camera, motion, camera.aspect, orbitTarget, viewport);
      controls.target.copy(orbitTarget);
      safePosition.copy(camera.position);
    },
    update(deltaSeconds: number) {
      if (disposed || !enabled || !visible) return false;
      cinematic = false;
      if (transition) return transition.isActive();
      const changed = controls.update(Math.min(0.1, Math.max(0, deltaSeconds)));
      let zooming = false;
      if (zoomDistance !== undefined) {
        const distance = camera.position.distanceTo(controls.target);
        const blend = reducedMotion ? 1 : 1 - Math.exp(-12 * Math.max(deltaSeconds, 1 / 120));
        const nextDistance = MathUtils.lerp(distance, zoomDistance, blend);
        zoomOffset.copy(camera.position).sub(controls.target).setLength(nextDistance);
        camera.position.copy(controls.target).add(zoomOffset);
        zooming = Math.abs(nextDistance - zoomDistance) > 0.002;
        if (!zooming) zoomDistance = undefined;
        enforceClearance();
      }
      orbitTarget.copy(controls.target);
      return changed || zooming;
    },
    resize() {
      if (disposed) return;
      viewport = canvas.getBoundingClientRect?.();
      if (cinematic && !manuallyAdjusted) {
        applyCinematicBayCamera(camera, latestMotion, camera.aspect, orbitTarget, viewport);
        controls.target.copy(orbitTarget);
      } else if (!manuallyAdjusted) {
        //
        // Resize must retain the composed homepage after the cinematic owner has handed off.
        // An in-flight reset starts from its current pose instead of freezing halfway.
        //
        moveToPreset(currentPreset, !transition || reducedMotion);
      } else {
        applyBayCameraFraming(camera, camera.aspect, framingProgress, viewport);
      }
      safePosition.copy(camera.position);
      notifyChange();
    },
    setEnabled(nextEnabled: boolean) {
      enabled = nextEnabled;
      controls.enabled = enabled && visible;
    },
    setVisible(nextVisible: boolean) {
      visible = nextVisible;
      controls.enabled = enabled && visible;
      transition?.paused(!visible);
      if (visible) notifyChange();
    },
    setCategory(preset: number, categoryReducedMotion: boolean) {
      if (!disposed && !manuallyAdjusted)
        moveToPreset(preset, categoryReducedMotion || reducedMotion);
    },
    reset(resetReducedMotion: boolean) {
      if (disposed) return;
      manuallyAdjusted = false;
      moveToPreset(0, resetReducedMotion || reducedMotion);
    },
    setReducedMotion(nextReducedMotion: boolean) {
      reducedMotion = nextReducedMotion;
      controls.enableDamping = !reducedMotion;
      if (reducedMotion && finishTransition) {
        const finish = finishTransition;
        transition?.kill();
        finish();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopTransition();
      controls.removeEventListener('change', handleControlChange);
      canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      canvas.removeEventListener('wheel', handleWheel, { capture: true });
      canvas.removeEventListener('keydown', handleKeyDown);
      controls.dispose();
      canvas.style.touchAction = originalTouchAction;
    },
  };
}
