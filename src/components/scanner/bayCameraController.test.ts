/**
 * Verifies continuous camera takeover, bounded exploration and interruptible reset behavior.
 * Depends on actual Three.js camera math with deterministic OrbitControls/GSAP adapters;
 * it protects ownership and projection without a browser, GPU or timed animation loop.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import {
  bayCameraLimits,
  createBayCameraController,
  isBayCameraInsideStructure,
} from './bayCameraController';
import { applyCinematicBayCamera } from './bayPresentation';

interface OrbitAdapter {
  target: Vector3;
  enabled: boolean;
  enablePan: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  rotateSpeed: number;
  zoomSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  autoRotate: boolean;
  mouseButtons: Record<string, number | null>;
  momentum: Vector3;
  update: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  addEventListener: (name: string, callback: () => void) => void;
  removeEventListener: (name: string, callback: () => void) => void;
  emitChange: () => void;
}
interface TweenAdapter {
  state: { progress: number };
  options: { paused: boolean; onUpdate: () => void; onComplete: () => void };
  kill: ReturnType<typeof vi.fn>;
  isActive: ReturnType<typeof vi.fn>;
  paused: ReturnType<typeof vi.fn>;
}
const motion = vi.hoisted(() => ({
  controls: undefined as unknown as OrbitAdapter,
  tweens: [] as TweenAdapter[],
}));
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
      return createOrbitAdapter(camera, canvas);
    }
  },
}));
vi.mock('gsap', () => ({
  default: {
    to: (state: TweenAdapter['state'], options: TweenAdapter['options']) => {
      const tween = { state, options, kill: vi.fn(), isActive: vi.fn(() => true), paused: vi.fn() };
      motion.tweens.push(tween);
      return tween;
    },
  },
}));

function createOrbitAdapter(camera: PerspectiveCamera, canvas: HTMLCanvasElement): OrbitAdapter {
  const listeners = new Map<string, Set<() => void>>();
  const controls: OrbitAdapter = {
    target: new Vector3(),
    enabled: true,
    enablePan: true,
    enableDamping: false,
    dampingFactor: 0,
    rotateSpeed: 1,
    zoomSpeed: 1,
    minDistance: 0,
    maxDistance: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    autoRotate: true,
    mouseButtons: { LEFT: 0, MIDDLE: 1, RIGHT: 2 },
    momentum: new Vector3(),
    update: vi.fn(() => {
      if (controls.momentum.lengthSq() === 0) return false;
      camera.position.add(controls.momentum);
      controls.momentum.multiplyScalar(controls.enableDamping ? 0.9 : 0);
      controls.emitChange();
      return true;
    }),
    dispose: vi.fn(),
    addEventListener: (name, callback) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)?.add(callback);
    },
    removeEventListener: (name, callback) => {
      listeners.get(name)?.delete(callback);
    },
    emitChange: () => {
      listeners.get('change')?.forEach((callback) => callback());
    },
  };

  //
  // OrbitControls updates the camera in its constructor; restoration must survive that side effect.
  //
  camera.position.set(50, 50, 50);
  camera.lookAt(0, 0, 0);
  canvas.style.touchAction = 'none';
  motion.controls = controls;
  return controls;
}

function setup() {
  const canvas = Object.assign(new EventTarget(), { style: { touchAction: 'pan-y' } });
  const camera = new PerspectiveCamera(32, 1.5);
  const initialTarget = new Vector3();
  applyCinematicBayCamera(
    camera,
    { revealProgress: 1, reframeProgress: 1 },
    camera.aspect,
    initialTarget,
  );
  const initialPosition = camera.position.clone();
  const initialRotation = camera.quaternion.clone();
  const onChange = vi.fn();
  const onManualInteraction = vi.fn();
  const controller = createBayCameraController({
    camera,
    canvas: canvas as unknown as HTMLCanvasElement,
    onChange,
    onManualInteraction,
  });
  controller.applyCinematic({ revealProgress: 1, reframeProgress: 1 });
  function dispatchInput(type: string, properties: Record<string, unknown>) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    canvas.dispatchEvent(event);
    return event;
  }
  return {
    canvas,
    camera,
    controller,
    onChange,
    onManualInteraction,
    initialPosition,
    initialRotation,
    pointer: (button = 0, pointerType = 'mouse') =>
      dispatchInput('pointerdown', { button, pointerType }),
    wheel: (deltaY: number, deltaMode = 0) => dispatchInput('wheel', { deltaY, deltaMode }),
    key: (key: string, properties: Record<string, unknown> = {}) =>
      dispatchInput('keydown', { key, ...properties }),
  };
}
function advanceTween(tween: TweenAdapter, progress: number) {
  tween.state.progress = progress;
  tween.options.onUpdate();
  if (progress === 1) tween.options.onComplete();
}
function settleCamera(controller: ReturnType<typeof createBayCameraController>) {
  let frameCount = 0;
  while (controller.update(1 / 60) && frameCount < 160) frameCount++;
  expect(frameCount).toBeLessThan(160);
}

beforeEach(() => {
  motion.tweens = [];
});

// ============================================================
// Same-camera handoff and bounded manual exploration
// ============================================================

describe('bay camera controller', () => {
  it('restores constructor side effects and transfers ownership without a camera or target jump', () => {
    const session = setup();
    expect(session.camera.position.distanceTo(session.initialPosition)).toBeLessThan(1e-10);
    expect(session.camera.quaternion.angleTo(session.initialRotation)).toBeLessThan(1e-7);
    const target = motion.controls.target.clone();
    session.pointer(2);
    expect(session.onManualInteraction).not.toHaveBeenCalled();
    session.pointer();
    expect(session.onManualInteraction).toHaveBeenCalledOnce();
    expect(session.camera.position.distanceTo(session.initialPosition)).toBeLessThan(1e-10);
    expect(session.camera.quaternion.angleTo(session.initialRotation)).toBeLessThan(1e-7);
    expect(motion.controls.target.equals(target)).toBe(true);
    session.controller.applyCinematic({ revealProgress: 0, reframeProgress: 0 });
    expect(session.camera.position.distanceTo(session.initialPosition)).toBeLessThan(1e-10);
    expect(motion.controls).toMatchObject({
      enablePan: false,
      autoRotate: false,
      enableDamping: true,
    });
    expect(motion.controls.mouseButtons).toMatchObject({ MIDDLE: null, RIGHT: null });
    expect(motion.controls.minPolarAngle).toBe(bayCameraLimits.minimumPolarAngle);
    expect(motion.controls.maxPolarAngle).toBeLessThanOrEqual(bayCameraLimits.maximumPolarAngle);
    session.controller.dispose();
  });

  it('ignores manual input while loading, disabled or hidden and accepts touch when restored', () => {
    const session = setup();
    session.controller.setEnabled(false);
    expect(session.wheel(100).defaultPrevented).toBe(false);
    session.key('ArrowLeft');
    session.pointer();
    session.controller.setEnabled(true);
    session.controller.setVisible(false);
    session.pointer();
    expect(session.controller.update(1 / 60)).toBe(false);
    expect(session.onManualInteraction).not.toHaveBeenCalled();
    expect(motion.controls.enabled).toBe(false);
    session.controller.setVisible(true);
    session.pointer(0, 'touch');
    expect(motion.controls.enabled).toBe(true);
    expect(session.onManualInteraction).toHaveBeenCalledOnce();
    session.controller.dispose();
  });

  it('clamps accumulated wheel zoom, settles damping and stops wheel propagation', () => {
    const session = setup();
    const bubbleWheel = vi.fn();
    session.canvas.addEventListener('wheel', bubbleWheel);
    const initialDistance = session.camera.position.distanceTo(motion.controls.target);
    const event = session.wheel(-240, 1);
    expect(event.defaultPrevented).toBe(true);
    expect(bubbleWheel).not.toHaveBeenCalled();
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeCloseTo(initialDistance);
    expect(session.controller.update(1 / 60)).toBe(true);
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeLessThan(
      initialDistance,
    );
    for (let index = 0; index < 40; index++) session.wheel(-240);
    settleCamera(session.controller);
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeGreaterThanOrEqual(
      bayCameraLimits.minimumDistance - 0.003,
    );
    for (let index = 0; index < 40; index++) session.wheel(240, 2);
    settleCamera(session.controller);
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeLessThanOrEqual(
      bayCameraLimits.maximumDistance + 0.003,
    );
    expect(session.controller.update(1 / 60)).toBe(false);
    session.controller.dispose();
  });

  it('rejects colliding orbit changes and keeps the camera above the floor', () => {
    const session = setup();
    session.pointer();
    const safePosition = session.camera.position.clone();
    session.camera.position.set(0, 1, 0);
    expect(isBayCameraInsideStructure(session.camera.position)).toBe(true);
    motion.controls.emitChange();
    expect(session.camera.position.equals(safePosition)).toBe(true);
    session.camera.position.set(8, -2, -8);
    motion.controls.emitChange();
    expect(session.camera.position.y).toBeGreaterThanOrEqual(bayCameraLimits.minimumHeight);
    expect(isBayCameraInsideStructure(session.camera.position)).toBe(false);
    session.controller.dispose();
  });

  it('offers bounded keyboard orbit and zoom while respecting modified shortcuts', () => {
    const session = setup();
    const initialPosition = session.camera.position.clone();
    session.key('ArrowLeft', { ctrlKey: true });
    expect(session.camera.position.equals(initialPosition)).toBe(true);
    expect(session.onManualInteraction).not.toHaveBeenCalled();
    const event = session.key('ArrowLeft');
    expect(event.defaultPrevented).toBe(true);
    expect(session.camera.position.distanceTo(initialPosition)).toBeGreaterThan(0);
    for (let index = 0; index < 120; index++) session.key('ArrowDown', { shiftKey: true });
    const orbit = new Spherical().setFromVector3(
      session.camera.position.clone().sub(motion.controls.target),
    );
    expect(orbit.phi).toBeLessThanOrEqual(bayCameraLimits.maximumPolarAngle + 1e-8);
    for (let index = 0; index < 80; index++) session.key('+');
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeGreaterThanOrEqual(
      bayCameraLimits.minimumDistance - 1e-8,
    );
    for (let index = 0; index < 80; index++) session.key('-');
    expect(session.camera.position.distanceTo(motion.controls.target)).toBeLessThanOrEqual(
      bayCameraLimits.maximumDistance + 1e-8,
    );
    session.controller.dispose();
  });

  it('preserves a manual pose through resize and category changes', () => {
    const session = setup();
    session.key('ArrowRight');
    const position = session.camera.position.clone();
    const fov = session.camera.fov;
    session.camera.aspect = 0.5;
    session.controller.resize();
    session.controller.setCategory(2, false);
    expect(session.camera.position.equals(position)).toBe(true);
    expect(session.camera.fov).toBe(fov);
    expect(motion.tweens).toHaveLength(0);
    session.controller.dispose();
  });

  it('flushes old damping without a reset jump and cancels that reset on the next drag', () => {
    const session = setup();
    session.pointer();
    motion.controls.momentum.set(0.4, 0, 0);
    const position = session.camera.position.clone();
    session.controller.reset(false);
    const tween = motion.tweens[0];
    expect(motion.controls.momentum.length()).toBe(0);
    expect(session.camera.position.equals(position)).toBe(true);
    expect(session.controller.update(1 / 60)).toBe(true);
    advanceTween(tween, 0.4);
    const intermediatePosition = session.camera.position.clone();
    session.pointer();
    expect(tween.kill).toHaveBeenCalledOnce();
    expect(session.camera.position.equals(intermediatePosition)).toBe(true);
    expect(session.controller.update(1 / 60)).toBe(false);
    session.controller.dispose();
  });

  it('pauses presets offscreen and settles an active reset immediately for reduced motion', () => {
    const session = setup();
    session.key('ArrowLeft');
    session.controller.reset(false);
    const tween = motion.tweens[0];
    advanceTween(tween, 0.3);
    session.controller.setVisible(false);
    expect(tween.paused).toHaveBeenLastCalledWith(true);
    session.controller.setVisible(true);
    expect(tween.paused).toHaveBeenLastCalledWith(false);
    session.controller.setReducedMotion(true);
    expect(tween.kill).toHaveBeenCalledOnce();
    expect(motion.controls.enableDamping).toBe(false);
    expect(session.camera.position.distanceTo(session.initialPosition)).toBeLessThan(1e-8);
    expect(session.controller.update(1 / 60)).toBe(false);
    session.controller.dispose();
  });

  it('returns from the opposite side around the bay without cutting through its centre', () => {
    const session = setup();
    session.pointer();
    session.camera.position.set(-9.2, 2.2, 11.6);
    motion.controls.emitChange();
    session.controller.reset(false);
    const tween = motion.tweens[0];
    let previousPosition = session.camera.position.clone();
    for (let step = 1; step <= 20; step++) {
      advanceTween(tween, step / 20);
      expect(session.camera.position.distanceTo(motion.controls.target)).toBeGreaterThanOrEqual(
        bayCameraLimits.minimumDistance,
      );
      expect(isBayCameraInsideStructure(session.camera.position)).toBe(false);
      expect(session.camera.position.distanceTo(previousPosition)).toBeLessThan(4);
      previousPosition = session.camera.position.clone();
    }
    expect(session.camera.position.distanceTo(session.initialPosition)).toBeLessThan(1e-8);
    session.controller.dispose();
  });

  it('retargets a reset on resize and reaches the new composed portrait pose', () => {
    const session = setup();
    session.key('ArrowLeft');
    session.key('Home');
    const originalTween = motion.tweens[0];
    advanceTween(originalTween, 0.4);
    const beforeResize = session.camera.position.clone();
    session.camera.aspect = 0.5;
    session.controller.resize();
    expect(originalTween.kill).toHaveBeenCalledOnce();
    expect(session.camera.position.distanceTo(beforeResize)).toBeLessThan(1e-8);
    const replacementTween = motion.tweens[1];
    advanceTween(replacementTween, 1);
    const expected = session.camera.clone();
    applyCinematicBayCamera(
      expected,
      { revealProgress: 1, reframeProgress: 1 },
      0.5,
      new Vector3(),
    );
    expect(session.camera.position.distanceTo(expected.position)).toBeLessThan(1e-8);
    expect(session.camera.fov).toBe(expected.fov);
    expect(session.controller.update(1 / 60)).toBe(false);
    session.controller.dispose();
  });

  it('removes listeners, restores touch scrolling and ignores input after disposal', () => {
    const session = setup();
    session.controller.reset(false);
    const tween = motion.tweens[0];
    session.controller.dispose();
    session.controller.dispose();
    const changeCount = session.onChange.mock.calls.length;
    session.pointer();
    session.wheel(-100);
    session.key('ArrowLeft');
    motion.controls.emitChange();
    expect(tween.kill).toHaveBeenCalledOnce();
    expect(motion.controls.dispose).toHaveBeenCalledOnce();
    expect(session.canvas.style.touchAction).toBe('pan-y');
    expect(session.onChange).toHaveBeenCalledTimes(changeCount);
    expect(session.onManualInteraction).not.toHaveBeenCalled();
    expect(session.controller.update(1 / 60)).toBe(false);
  });
});
