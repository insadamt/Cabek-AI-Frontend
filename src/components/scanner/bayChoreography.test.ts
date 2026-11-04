/**
 * Protects the single cinematic journey and independent category-light ownership.
 * Depends on real Three.js colors and a deterministic GSAP adapter so phase order,
 * interruption and visibility can be checked without rendering or elapsed time.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Color } from 'three';
import { createBayChoreography, type BayPalette } from './bayChoreography';

interface TimelineStep {
  target: Record<string, unknown>;
  properties: Record<string, unknown>;
  position: number | string;
}
interface TimelineMock {
  options: { paused: boolean; onUpdate: () => void; onComplete?: () => void };
  position: number;
  labels: Record<string, number>;
  steps: TimelineStep[];
  stoppedProperties: Set<string>;
  addLabel: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  progress: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  killTweensOf: ReturnType<typeof vi.fn>;
}

const motion = vi.hoisted(() => ({ timelines: [] as TimelineMock[] }));
vi.mock('gsap', () => ({
  default: {
    timeline: (options: TimelineMock['options']) => {
      const timeline: TimelineMock = {
        options,
        position: 0,
        labels: {},
        steps: [],
        stoppedProperties: new Set(),
        addLabel: vi.fn((name: string, position: number) => {
          timeline.labels[name] = position;
          return timeline;
        }),
        to: vi.fn((target, properties, position = 0) => {
          timeline.steps.push({ target, properties, position });
          return timeline;
        }),
        progress: vi.fn((progress?: number) => {
          if (progress === undefined) return timeline.position;
          timeline.position = progress;
          if (progress === 1) {
            for (const step of timeline.steps) {
              for (const [property, value] of Object.entries(step.properties)) {
                if (
                  !['duration', 'ease'].includes(property) &&
                  !timeline.stoppedProperties.has(property)
                ) {
                  step.target[property] = value;
                }
              }
            }
            options.onUpdate();
            options.onComplete?.();
          }
          return timeline;
        }),
        play: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        kill: vi.fn(),
        killTweensOf: vi.fn((_target, properties: string) => {
          properties.split(',').forEach((property) => timeline.stoppedProperties.add(property));
          return timeline;
        }),
      };
      motion.timelines.push(timeline);
      return timeline;
    },
  },
}));

const initialPalette: BayPalette = { primary: '#b6f458', secondary: '#e0ffad' };
const quickPalette: BayPalette = { primary: '#48cfe0', secondary: '#c4f8ff', focus: 0.6 };
const verificationPalette: BayPalette = {
  primary: '#a79bff',
  secondary: '#71e8d4',
  focus: 1,
  sensorEmphasis: 0.8,
};

function setup({ parked = false, reduced = false } = {}) {
  const onChange = vi.fn();
  const onIntroComplete = vi.fn();
  const controller = createBayChoreography({
    initiallyParked: parked,
    reducedMotion: reduced,
    initialPalette,
    onChange,
    onIntroComplete,
  });
  return { controller, onChange, onIntroComplete };
}

function expectPalette(controller: ReturnType<typeof createBayChoreography>, palette: BayPalette) {
  expect(controller.state.primary.equals(new Color(palette.primary))).toBe(true);
  expect(controller.state.secondary.equals(new Color(palette.secondary))).toBe(true);
  expect(controller.state.focus).toBe(palette.focus ?? 0);
  expect(controller.state.sensorEmphasis).toBe(palette.sensorEmphasis ?? 0);
}

beforeEach(() => {
  motion.timelines = [];
});

// ============================================================
// Cinematic order, interruption and one-time completion
// ============================================================

describe('cinematic bay choreography', () => {
  it('keeps the car outside through page entry and motion preference changes until Scanner is clicked', () => {
    const { controller } = setup({ parked: true });
    controller.waitOutside();
    controller.enter();
    controller.setReducedMotion(true);
    expect(controller.state).toMatchObject({ entryProgress: 0, introComplete: true });
    expect(motion.timelines).toHaveLength(0);
    const arrived = vi.fn();
    controller.replayEntry(arrived);
    expect(controller.state.entryProgress).toBe(1);
    expect(arrived).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('drives from the waiting position before releasing capture admission', () => {
    const { controller } = setup({ parked: true });
    controller.waitOutside();
    const arrived = vi.fn();
    controller.replayEntry(arrived);
    expect(controller.state.entryProgress).toBe(0);
    expect(arrived).not.toHaveBeenCalled();
    motion.timelines[0].progress(1);
    expect(controller.state.entryProgress).toBe(1);
    expect(arrived).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('starts camera and vehicle immediately and overlaps the reframe to finish within 2.4 seconds', () => {
    const { controller, onChange, onIntroComplete } = setup();
    expect(controller.state).toMatchObject({
      entryProgress: 0,
      revealProgress: 0,
      reframeProgress: 0,
      introComplete: false,
    });
    controller.enter();
    controller.enter();
    expect(motion.timelines).toHaveLength(1);
    const entrance = motion.timelines[0];
    expect(entrance.labels.reveal).toBe(0);
    expect(entrance.labels['vehicle-entry']).toBe(0);
    expect(
      entrance.steps.map((step) =>
        Object.keys(step.properties).filter((key) => key.endsWith('Progress')),
      ),
    ).toEqual([['revealProgress'], ['entryProgress'], ['reframeProgress']]);
    const [reveal, entry, reframe] = entrance.steps;
    const startOf = (step: TimelineStep) =>
      typeof step.position === 'number' ? step.position : entrance.labels[step.position];
    expect(startOf(reveal)).toBe(entrance.labels.reveal);
    expect(startOf(reframe)).toBeLessThan(startOf(entry) + Number(entry.properties.duration));
    expect(entrance.labels.categories).toBeGreaterThanOrEqual(
      startOf(reframe) + Number(reframe.properties.duration),
    );
    expect(entrance.labels.categories).toBeLessThanOrEqual(2.4);
    expect(entrance.play).toHaveBeenCalledOnce();
    entrance.options.onUpdate();
    expect(onChange).toHaveBeenCalledOnce();
    expect(onIntroComplete).not.toHaveBeenCalled();
    entrance.progress(1);
    entrance.options.onComplete?.();
    controller.enter();
    expect(controller.state).toMatchObject({
      entryProgress: 1,
      revealProgress: 1,
      reframeProgress: 1,
      introComplete: true,
    });
    expect(onIntroComplete).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('replays the drive from a parked car and waits for arrival before accepting capture', () => {
    const { controller } = setup({ parked: true });
    const acceptCapture = vi.fn();
    controller.enter();
    controller.replayEntry(acceptCapture);
    expect(controller.state).toMatchObject({ entryProgress: 0, introComplete: false });
    expect(acceptCapture).not.toHaveBeenCalled();
    motion.timelines[0].progress(1);
    expect(controller.state.entryProgress).toBe(1);
    expect(acceptCapture).toHaveBeenCalledOnce();
    motion.timelines[0].options.onComplete?.();
    expect(acceptCapture).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('settles a replay immediately for reduced motion and releases waiters on disposal', () => {
    const reduced = setup({ reduced: true }).controller;
    const accepted = vi.fn();
    reduced.replayEntry(accepted);
    expect(accepted).toHaveBeenCalledOnce();
    expect(reduced.state.entryProgress).toBe(1);
    reduced.dispose();
    const normal = setup({ parked: true }).controller;
    const released = vi.fn();
    normal.replayEntry(released);
    normal.dispose();
    expect(released).toHaveBeenCalledOnce();
  });

  it('skips all phases immediately and reports completion only once', () => {
    const { controller, onIntroComplete } = setup();
    controller.enter();
    controller.state.entryProgress = 0.25;
    controller.skipIntro();
    controller.skipIntro();
    controller.enter();
    expect(controller.state).toMatchObject({
      entryProgress: 1,
      revealProgress: 1,
      reframeProgress: 1,
      introComplete: true,
    });
    expect(motion.timelines[0].kill).toHaveBeenCalledOnce();
    expect(onIntroComplete).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('hands the camera to the user without teleporting the car or stopping its journey', () => {
    const { controller, onIntroComplete } = setup();
    controller.enter();
    controller.state.entryProgress = 0.35;
    controller.state.revealProgress = 0.7;
    controller.interruptCamera();
    controller.interruptCamera();
    const entrance = motion.timelines[0];
    expect(entrance.kill).not.toHaveBeenCalled();
    expect(entrance.killTweensOf).toHaveBeenCalledWith(
      controller.state,
      'revealProgress,reframeProgress',
    );
    expect(controller.state.entryProgress).toBe(0.35);
    entrance.progress(1);
    expect(controller.state.entryProgress).toBe(1);
    expect(controller.state.revealProgress).toBe(0.7);
    expect(controller.state.reframeProgress).toBe(0);
    expect(onIntroComplete).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it.each([{ parked: true }, { reduced: true }])(
    'initializes settled poses without creating an entrance: %j',
    (settings) => {
      const { controller, onIntroComplete } = setup(settings);
      expect(controller.state).toMatchObject({
        entryProgress: 1,
        revealProgress: 1,
        reframeProgress: 1,
        introComplete: true,
      });
      controller.enter();
      controller.enter();
      expect(motion.timelines).toHaveLength(0);
      expect(onIntroComplete).toHaveBeenCalledOnce();
      controller.dispose();
    },
  );

  it('parks a drive after manual takeover for cached return without reporting completion twice', () => {
    const { controller, onIntroComplete } = setup();
    controller.enter();
    controller.state.entryProgress = 0.35;
    controller.state.revealProgress = 0.7;
    controller.interruptCamera();
    controller.park();
    expect(controller.state).toMatchObject({
      entryProgress: 1,
      revealProgress: 1,
      reframeProgress: 1,
      introComplete: true,
    });
    expect(motion.timelines[0].kill).toHaveBeenCalledOnce();
    expect(onIntroComplete).toHaveBeenCalledOnce();
    controller.park();
    expect(motion.timelines[0].kill).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('retargets lighting from live colors while leaving the current entrance intact', () => {
    const { controller } = setup();
    controller.enter();
    controller.state.entryProgress = 0.4;
    controller.setPalette(quickPalette);
    const [entrance, supersededLights] = motion.timelines;
    const primaryReference = controller.state.primary;
    controller.state.primary.set('#7fcbaa');
    const currentColor = primaryReference.clone();
    controller.setPalette(verificationPalette);
    controller.setPalette(verificationPalette);
    expect(motion.timelines).toHaveLength(3);
    expect(supersededLights.kill).toHaveBeenCalledOnce();
    expect(entrance.kill).not.toHaveBeenCalled();
    expect(controller.state.entryProgress).toBe(0.4);
    expect(controller.state.primary).toBe(primaryReference);
    expect(primaryReference.equals(currentColor)).toBe(true);
    const latestLights = motion.timelines[2];
    expect(latestLights.steps.map((step) => step.target)).toEqual([
      controller.state.primary,
      controller.state.secondary,
      controller.state,
    ]);
    expect(latestLights.steps.every((step) => step.position === 0)).toBe(true);
    latestLights.progress(1);
    expectPalette(controller, verificationPalette);
    controller.dispose();
  });

  it('keeps hidden transitions paused and resumes only unfinished motion', () => {
    const { controller } = setup();
    controller.setVisible(false);
    controller.enter();
    controller.setPalette(quickPalette);
    const [entrance, lighting] = motion.timelines;
    expect(entrance.options.paused && lighting.options.paused).toBe(true);
    expect(entrance.play).not.toHaveBeenCalled();
    expect(lighting.play).not.toHaveBeenCalled();
    entrance.position = 0.43;
    lighting.position = 0.6;
    controller.setVisible(true);
    expect(entrance.resume).toHaveBeenCalledOnce();
    expect(lighting.resume).toHaveBeenCalledOnce();
    expect(entrance.position).toBe(0.43);
    controller.setVisible(false);
    expect(entrance.pause).toHaveBeenCalledOnce();
    expect(lighting.pause).toHaveBeenCalledOnce();
    entrance.position = 1;
    lighting.position = 1;
    controller.setVisible(true);
    expect(entrance.resume).toHaveBeenCalledOnce();
    expect(lighting.resume).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('settles the latest lights and every entrance phase when reduced motion is enabled', () => {
    const { controller, onIntroComplete } = setup();
    controller.enter();
    controller.setPalette(quickPalette);
    controller.setPalette(verificationPalette);
    const [entrance, supersededLights, latestLights] = motion.timelines;
    controller.state.entryProgress = 0.2;
    controller.setReducedMotion(true);
    expect(controller.state).toMatchObject({
      entryProgress: 1,
      revealProgress: 1,
      reframeProgress: 1,
      introComplete: true,
    });
    expectPalette(controller, verificationPalette);
    expect(entrance.kill).toHaveBeenCalledOnce();
    expect(supersededLights.kill).toHaveBeenCalledOnce();
    expect(latestLights.kill).toHaveBeenCalledOnce();
    expect(onIntroComplete).toHaveBeenCalledOnce();
    controller.setReducedMotion(false);
    controller.enter();
    expect(motion.timelines).toHaveLength(3);
    controller.dispose();
  });

  it('ignores equivalent linear colors and applies reduced-motion palette changes synchronously', () => {
    const { controller } = setup({ reduced: true });
    controller.setPalette({ primary: '#B6F458', secondary: '#E0FFAD' });
    expect(motion.timelines).toHaveLength(0);
    controller.setPalette(quickPalette);
    expectPalette(controller, quickPalette);
    expect(motion.timelines).toHaveLength(0);
    controller.dispose();
  });

  it('releases both timelines once and ignores late callbacks and commands after disposal', () => {
    const { controller, onChange, onIntroComplete } = setup();
    controller.enter();
    controller.setPalette(quickPalette);
    const [entrance, lighting] = motion.timelines;
    controller.dispose();
    controller.dispose();
    controller.enter();
    controller.skipIntro();
    controller.interruptCamera();
    controller.setPalette(verificationPalette);
    controller.setReducedMotion(true);
    controller.setVisible(false);
    entrance.options.onUpdate();
    entrance.options.onComplete?.();
    expect(entrance.kill).toHaveBeenCalledOnce();
    expect(lighting.kill).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(onIntroComplete).not.toHaveBeenCalled();
    expect(controller.state.entryProgress).toBe(0);
    expect(motion.timelines).toHaveLength(2);
  });
});
