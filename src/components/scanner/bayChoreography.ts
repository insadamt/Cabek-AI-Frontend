/**
 * Orchestrates a continuous POV, reveal, drive and reframing sequence without moving the tunnel.
 * Independent category lighting survives camera interruption; depends on GSAP, Three.js colors and runtime visibility.
 */
import gsap from 'gsap';
import { Color } from 'three';

export interface BayPalette {
  primary: string;
  secondary: string;
  focus?: number;
  sensorEmphasis?: number;
  cameraPreset?: number;
}

export interface BayChoreographyState {
  entryProgress: number;
  revealProgress: number;
  reframeProgress: number;
  introComplete: boolean;
  primary: Color;
  secondary: Color;
  focus: number;
  sensorEmphasis: number;
}

interface BayChoreographyOptions {
  initiallyParked: boolean;
  reducedMotion: boolean;
  initialPalette: BayPalette;
  onChange: () => void;
  onIntroComplete?: () => void;
}

// ============================================================
// One entrance owner, independent illumination and safe camera handoff
// ============================================================

export function createBayChoreography(options: BayChoreographyOptions) {
  const settled = options.initiallyParked || options.reducedMotion;
  const state: BayChoreographyState = {
    entryProgress: settled ? 1 : 0,
    revealProgress: settled ? 1 : 0,
    reframeProgress: settled ? 1 : 0,
    introComplete: settled,
    primary: new Color(options.initialPalette.primary),
    secondary: new Color(options.initialPalette.secondary),
    focus: options.initialPalette.focus ?? 0,
    sensorEmphasis: options.initialPalette.sensorEmphasis ?? 0,
  };
  const requestedPrimary = state.primary.clone();
  const requestedSecondary = state.secondary.clone();
  let requestedFocus = state.focus;
  let requestedSensorEmphasis = state.sensorEmphasis;
  let entranceRequested = options.initiallyParked;
  let completionReported = false;
  let reducedMotion = options.reducedMotion;
  let visible = true;
  let disposed = false;
  let entrance: gsap.core.Timeline | undefined;
  let lighting: gsap.core.Timeline | undefined;

  function notifyChange() {
    if (!disposed) options.onChange();
  }

  function reportCompletion() {
    if (disposed || completionReported) return;
    completionReported = true;
    state.introComplete = true;
    options.onIntroComplete?.();
    notifyChange();
  }

  function settleEntrance() {
    entrance?.kill();
    entrance = undefined;
    state.entryProgress = 1;
    state.revealProgress = 1;
    state.reframeProgress = 1;
    reportCompletion();
    notifyChange();
  }

  function settleLighting() {
    state.primary.copy(requestedPrimary);
    state.secondary.copy(requestedSecondary);
    state.focus = requestedFocus;
    state.sensorEmphasis = requestedSensorEmphasis;
  }

  return {
    state,
    enter() {
      if (disposed) return;
      if (entranceRequested || reducedMotion || state.entryProgress === 1) {
        if (state.entryProgress === 1 || reducedMotion) settleEntrance();
        return;
      }
      entranceRequested = true;
      entrance = gsap.timeline({
        paused: true,
        onUpdate: notifyChange,
        onComplete: reportCompletion,
      });
      entrance.addLabel('pov', 0);
      entrance.addLabel('reveal', 0.4);
      entrance.to(state, { revealProgress: 1, duration: 2.65, ease: 'power2.inOut' }, 'reveal');
      entrance.addLabel('vehicle-entry', 3.1);
      entrance.to(
        state,
        { entryProgress: 1, duration: 3.5, ease: 'power2.inOut' },
        'vehicle-entry',
      );
      entrance.addLabel('reframe', 6.75);
      entrance.to(state, { reframeProgress: 1, duration: 1.65, ease: 'power2.inOut' }, 'reframe');
      entrance.addLabel('categories', 8.4);
      if (visible) entrance.play();
    },
    interruptCamera() {
      if (disposed || state.introComplete) return;

      //
      // Keep the car's existing trajectory alive so taking the camera never teleports the vehicle.
      //
      entrance?.killTweensOf(state, 'revealProgress,reframeProgress');
      reportCompletion();
    },
    skipIntro() {
      if (disposed || state.introComplete) return;
      entrance?.progress(1);
      settleEntrance();
    },
    setPalette(palette: BayPalette) {
      if (disposed) return;
      const nextPrimary = new Color(palette.primary);
      const nextSecondary = new Color(palette.secondary);
      const nextFocus = palette.focus ?? 0;
      const nextSensorEmphasis = palette.sensorEmphasis ?? 0;
      if (
        requestedPrimary.equals(nextPrimary) &&
        requestedSecondary.equals(nextSecondary) &&
        requestedFocus === nextFocus &&
        requestedSensorEmphasis === nextSensorEmphasis
      )
        return;
      requestedPrimary.copy(nextPrimary);
      requestedSecondary.copy(nextSecondary);
      requestedFocus = nextFocus;
      requestedSensorEmphasis = nextSensorEmphasis;
      lighting?.kill();
      lighting = undefined;
      if (reducedMotion) {
        settleLighting();
        notifyChange();
        return;
      }
      lighting = gsap.timeline({ paused: true, onUpdate: notifyChange });
      const transition = { duration: 0.95, ease: 'power2.inOut' };
      lighting.to(
        state.primary,
        { r: nextPrimary.r, g: nextPrimary.g, b: nextPrimary.b, ...transition },
        0,
      );
      lighting.to(
        state.secondary,
        { r: nextSecondary.r, g: nextSecondary.g, b: nextSecondary.b, ...transition },
        0,
      );
      lighting.to(
        state,
        { focus: nextFocus, sensorEmphasis: nextSensorEmphasis, ...transition },
        0,
      );
      if (visible) lighting.play();
    },
    setReducedMotion(nextReducedMotion: boolean) {
      if (disposed || reducedMotion === nextReducedMotion) return;
      reducedMotion = nextReducedMotion;
      if (!reducedMotion) return;
      lighting?.kill();
      lighting = undefined;
      settleLighting();
      settleEntrance();
    },
    setVisible(nextVisible: boolean) {
      if (disposed || visible === nextVisible) return;
      visible = nextVisible;
      for (const timeline of [entrance, lighting]) {
        if (!visible) timeline?.pause();
        else if (!reducedMotion && timeline && timeline.progress() < 1) timeline.resume();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      entrance?.kill();
      lighting?.kill();
      entrance = undefined;
      lighting = undefined;
    },
  };
}
