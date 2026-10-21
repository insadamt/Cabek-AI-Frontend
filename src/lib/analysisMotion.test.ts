import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocumentFusionTimeline } from './analysisMotion';

function createFlightFixture(paperHeight = 320) {
  const flight = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    borderRadius: '18px',
    borderColor: '#ededed',
    boxShadow: '0px 16px 40px 0px rgba(0, 0, 0, 0.1)',
    '--fusion-front': '-12%',
  };
  const geometry = {
    paperWidth: 280,
    paperHeight,
    paperBounds: { left: 400, top: 300, width: 280, height: paperHeight },
    islandBounds: { left: 360, width: 340, bottom: 80 },
    paperStyle: {
      borderRadius: flight.borderRadius,
      borderColor: flight.borderColor,
      boxShadow: flight.boxShadow,
    },
  };
  const onContact = vi.fn();

  // Exercise the real timeline against numeric targets without starting a browser.

  const timeline = createDocumentFusionTimeline(
    flight as unknown as HTMLElement,
    geometry,
    onContact,
  );
  return { flight, geometry, timeline, onContact };
}

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
});

describe('document material fusion', () => {
  it.each([200, 400, 1000])(
    'fully hides a %ipx sheet behind the island edge at absorption',
    (height) => {
      const { flight, geometry, timeline, onContact } = createFlightFixture(height);
      timeline.progress(1);
      const visibleBottom = flight.y + height / 2 + (height * flight.scaleY) / 2;
      expect(visibleBottom).toBeLessThan(geometry.islandBounds.bottom - 1);
      expect(Number.parseFloat(flight['--fusion-front'])).toBeGreaterThan(100);
      expect(flight.opacity).toBe(1);
      expect(onContact).toHaveBeenCalledTimes(1);
    },
  );

  it('darkens progressively and removes darkness from the bottom first on release', () => {
    const { flight, timeline } = createFlightFixture();
    timeline.progress(1, true);
    expect(Number.parseFloat(flight['--fusion-front'])).toBeGreaterThan(100);
    timeline.time(0.65);
    const emergingDarkness = Number.parseFloat(flight['--fusion-front']);
    expect(emergingDarkness).toBeGreaterThan(0);
    expect(emergingDarkness).toBeLessThan(100);
    timeline.time(0.4);
    expect(Number.parseFloat(flight['--fusion-front'])).toBeLessThan(emergingDarkness);
    expect(flight.opacity).toBe(1);
  });

  it('restores native document position, material, corners and shadow at the return handoff', () => {
    const { flight, geometry, timeline } = createFlightFixture();
    timeline.progress(1, true).progress(0);
    expect(flight.x).toBe(geometry.paperBounds.left);
    expect(flight.y).toBe(geometry.paperBounds.top);
    expect(flight.scaleX).toBe(1);
    expect(flight.scaleY).toBe(1);
    expect(flight.rotation).toBe(0);
    expect(Number.parseFloat(flight['--fusion-front'])).toBeLessThan(-8);
    expect(flight.borderRadius).toBe(geometry.paperStyle.borderRadius);
    expect(flight.boxShadow).toBe(geometry.paperStyle.boxShadow);
  });
});
