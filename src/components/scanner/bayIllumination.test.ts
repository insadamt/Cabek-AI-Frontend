/**
 * Verifies that scanner activity follows the car and category atmosphere survives brightness changes.
 * Depends on real Three.js light/material state and the illumination controller; no renderer is created.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Color, Material, MeshPhysicalMaterial, MeshStandardMaterial, PointLight } from 'three';
import { createBayIllumination, type BayIlluminationState } from './bayIllumination';

const resources: Material[] = [];
afterEach(() => resources.splice(0).forEach((material) => material.dispose()));

function createIlluminationFixture() {
  const portals = [-2.8, 0, 2.8].map((depth) => ({
    depth,
    material: new MeshStandardMaterial(),
    lights: [new PointLight(), new PointLight()],
  }));
  const ambientMaterial = new MeshStandardMaterial();
  const sensorMaterial = new MeshStandardMaterial();
  const sensorGlass = new MeshPhysicalMaterial();
  resources.push(
    ...portals.map(({ material }) => material),
    ambientMaterial,
    sensorMaterial,
    sensorGlass,
  );
  const illumination = createBayIllumination({
    portals,
    ambientMaterial,
    sensorMaterial,
    sensorGlass,
  });
  const state: BayIlluminationState = {
    entryProgress: 1,
    primary: new Color('#b8f36b'),
    secondary: new Color('#dcecc5'),
    focus: 0,
    sensorEmphasis: 0,
  };
  return { ...illumination, portals, ambientMaterial, sensorMaterial, sensorGlass, state };
}

describe('physical tunnel atmosphere', () => {
  it('activates the entrance, center and rear portals in vehicle travel order, then settles', () => {
    const fixture = createIlluminationFixture();
    const [rear, center, entrance] = fixture.portals;
    for (const [entryProgress, active] of [
      [(7.2 - 2.4 - 2.8) / 7.2, entrance],
      [(7.2 - 2.4) / 7.2, center],
      [0.95, rear],
    ] as const) {
      fixture.applyIllumination({ ...fixture.state, entryProgress });
      for (const portal of fixture.portals.filter((candidate) => candidate !== active)) {
        expect(active.material.emissiveIntensity).toBeGreaterThan(
          portal.material.emissiveIntensity,
        );
        expect(active.lights[0].intensity).toBeGreaterThan(portal.lights[0].intensity);
      }
    }
    fixture.applyIllumination(fixture.state);
    fixture.portals.forEach(({ material, lights }) => {
      expect(material.emissiveIntensity).toBeCloseTo(0.75 * 0.68);
      expect(lights[0].intensity).toBeCloseTo(2.4);
    });
  });

  it('concentrates quick inspection around the center and preserves that pattern when brightness changes', () => {
    const fixture = createIlluminationFixture();
    const primary = new Color('#64e2dc');
    fixture.applyIllumination({ ...fixture.state, primary, focus: 1, entryProgress: 0.64 });
    const strengths = fixture.portals.map(({ lights }) => lights[0].intensity);
    const emissions = fixture.portals.map(({ material }) => material.emissiveIntensity);
    const [rear, center, entrance] = strengths;
    expect(center).toBeGreaterThan(rear * 3);
    expect(center).toBeGreaterThan(entrance * 3);
    const displayedColor = fixture.portals[0].material.emissive.clone();
    primary.set('#ff0000');
    fixture.applyBrightness(0.3);
    fixture.portals.forEach(({ material, lights }, index) => {
      expect(lights[0].intensity).toBeCloseTo(strengths[index] * 0.4);
      expect(material.emissiveIntensity).toBeCloseTo(emissions[index] * 0.4);
    });
    expect(fixture.portals[0].material.emissive.equals(displayedColor)).toBe(true);
  });

  it('uses neutral photo illumination and makes sensor windows and status bars more visible', () => {
    const fixture = createIlluminationFixture();
    fixture.applyIllumination(fixture.state);
    const quietGlassEmission = fixture.sensorGlass.emissiveIntensity;
    const quietStatusEmission = fixture.sensorMaterial.emissiveIntensity;
    const photoWhite = new Color('#f0f3f5');
    fixture.applyIllumination({
      ...fixture.state,
      primary: photoWhite,
      secondary: photoWhite,
      sensorEmphasis: 1,
    });
    fixture.portals.forEach(({ material, lights }) => {
      expect(material.emissive.equals(photoWhite)).toBe(true);
      expect(lights[0].color.equals(photoWhite)).toBe(true);
    });
    expect(fixture.sensorGlass.emissiveIntensity).toBeGreaterThan(quietGlassEmission);
    expect(fixture.sensorMaterial.emissiveIntensity).toBeGreaterThan(quietStatusEmission);
    expect(fixture.sensorMaterial.emissive.equals(new Color('#eaf3f4'))).toBe(true);
  });
});
