/**
 * Exercises actual GSAP playback and the shared landing pose so mocked timelines cannot hide broken motion.
 * Depends on bayChoreography, bayPresentation and CPU-only Three.js transforms; needs no browser or GPU.
 */
import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { createBayChoreography } from './bayChoreography';
import { applyBayVehicle, applyCinematicBayCamera } from './bayPresentation';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
});

// ============================================================
// Real animation progression and consistent landing views
// ============================================================

describe('actual bay playback', () => {
  it('moves immediately and overlaps entry with reframing before a short reference-view landing', () => {
    const camera = new PerspectiveCamera(32, 1862 / 956, 0.1, 120);
    const target = new Vector3();
    const wheel = new Group();
    const vehicle = { root: new Group(), wheels: [wheel], dispose() {} };
    const onIntroComplete = vi.fn();
    const onChange = vi.fn(() => {
      applyBayVehicle(vehicle, playback.state.entryProgress);
      applyCinematicBayCamera(camera, playback.state, camera.aspect, target);
    });
    const playback = createBayChoreography({
      initiallyParked: false,
      reducedMotion: false,
      initialPalette: { primary: '#b8db80', secondary: '#e5edcf' },
      onChange,
      onIntroComplete,
    });
    playback.enter();
    const entrance = gsap.getTweensOf(playback.state)[0].parent as gsap.core.Timeline;

    //
    // Seek the real timeline deterministically: elapsed wall time would make this regression flaky.
    //
    expect(entrance.duration()).toBeLessThanOrEqual(2.4);
    entrance.pause().time(0.15, false);
    const revealingCamera = camera.position.clone();
    const openingProjection = camera.projectionMatrix.clone();
    const openingTarget = target.clone();
    expect(vehicle.root.position.z).toBeGreaterThan(6.5);
    expect(vehicle.root.position.z).toBeLessThan(7.2);
    expect(playback.state.revealProgress).toBeGreaterThan(0);
    expect(playback.state.revealProgress).toBeLessThan(1);
    entrance.time(0.9, false);
    expect(vehicle.root.position.z).toBeGreaterThan(0);
    expect(vehicle.root.position.z).toBeLessThan(7.2);
    expect(wheel.rotation.x).toBeLessThan(0);
    expect(camera.position.distanceTo(revealingCamera)).toBeGreaterThan(0);
    expect(camera.projectionMatrix.equals(openingProjection)).toBe(true);
    expect(target.equals(openingTarget)).toBe(true);
    expect(onIntroComplete).not.toHaveBeenCalled();
    expect(playback.state.reframeProgress).toBeGreaterThan(0);
    entrance.time(1.95, false);
    expect(vehicle.root.position.z).toBe(0);
    expect(playback.state.reframeProgress).toBeGreaterThan(0);
    expect(playback.state.reframeProgress).toBeLessThan(1);
    entrance.time(entrance.duration(), false);
    expect(onIntroComplete).toHaveBeenCalledOnce();
    expect(camera.position.x).toBeCloseTo(4.3 * 1.12);
    expect(camera.position.y).toBeCloseTo(0.6 + 3.2 * 1.12);
    expect(camera.position.z).toBeCloseTo(-9.5 * 1.12);
    expect(target.toArray()).toEqual([0, 0.6, 0]);
    expect(camera.projectionMatrix.equals(openingProjection)).toBe(true);
    expect(onChange).toHaveBeenCalled();
    const landingPosition = camera.position.clone();
    const landingProjection = camera.projectionMatrix.clone();

    playback.dispose();
    const skippedPlayback = createBayChoreography({
      initiallyParked: false,
      reducedMotion: false,
      initialPalette: { primary: '#b8db80', secondary: '#e5edcf' },
      onChange() {},
    });
    skippedPlayback.enter();
    skippedPlayback.skipIntro();
    applyCinematicBayCamera(camera, skippedPlayback.state, camera.aspect, target);
    expect(camera.position.equals(landingPosition)).toBe(true);
    expect(camera.projectionMatrix.equals(landingProjection)).toBe(true);
    skippedPlayback.dispose();
  });
});
