/**
 * Applies category atmosphere and a travelling scan response to the physical tunnel lights.
 * Depends on Three.js materials, portal positions and the vehicle's 7.2 m approach / 4.8 m length;
 * visual brightness multiplies the active choreography so adjusting settings preserves its shape.
 */
import {
  Color,
  MathUtils,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type PointLight,
} from 'three';

export interface BayIlluminationState {
  entryProgress: number;
  primary: Color;
  secondary: Color;
  focus: number;
  sensorEmphasis: number;
  captureDepth?: number;
  capturing?: boolean;
}

export interface PortalIllumination {
  depth: number;
  material: MeshStandardMaterial;
  lights: PointLight[];
}

interface BayIlluminationSurfaces {
  portals: PortalIllumination[];
  ambientMaterial: MeshStandardMaterial;
  sensorMaterial: MeshStandardMaterial;
  sensorGlass: MeshPhysicalMaterial;
}

// ============================================================
// Independent portal responses without extra lights or render effects
// ============================================================

export function createBayIllumination(surfaces: BayIlluminationSurfaces) {
  const state: BayIlluminationState = {
    entryProgress: 0,
    primary: new Color('#b8f36b'),
    secondary: new Color('#dcecc5'),
    focus: 0,
    sensorEmphasis: 0,
  };
  const neutralSensorLight = new Color('#eaf3f4');
  const diffuserSurface = new Color('#edf2e7');
  const quietSensorGlass = new Color('#112c36');
  const inspectionSensorGlass = new Color('#30434a');
  let illumination = 0.75;

  function applyCurrentIllumination() {
    const progress = MathUtils.clamp(state.entryProgress, 0, 1);
    const vehicleFront = 7.2 * (1 - progress) - 4.8 / 2;
    const focus = MathUtils.clamp(state.focus, 0, 1);
    const sensorEmphasis = MathUtils.clamp(state.sensorEmphasis, 0, 1);

    //
    // The nose reaches each portal in order; fading the response at parking avoids idle motion.
    //
    const movingScan = progress > 0 && progress < 1 ? Math.min(1, (1 - progress) / 0.15) : 0;
    surfaces.portals.forEach(({ depth, material, lights }, index) => {
      const proximity = Math.exp(-Math.pow((vehicleFront - depth) / 1.1, 2));
      const captureResponse = state.capturing
        ? Math.exp(-Math.pow(((state.captureDepth ?? 0) - depth) / 0.9, 2))
        : 0;
      const scanResponse = movingScan * proximity + captureResponse;
      const focusedStrength = depth === 0 ? 1.2 : 0.34;
      const atmosphere = MathUtils.lerp(1, focusedStrength, focus);
      material.emissive.copy(state.primary).lerp(state.secondary, index / 4);
      //
      // Tint the diffuser itself so neutral softboxes do not wash lime strips back to white.
      //
      material.color.copy(material.emissive).lerp(diffuserSurface, 0.35);
      material.emissiveIntensity = illumination * (0.68 * atmosphere + scanResponse * 0.75);
      lights.forEach((light) => {
        light.color.copy(material.emissive);
        light.intensity = illumination * (3.2 * atmosphere + scanResponse * 2);
      });
    });
    surfaces.ambientMaterial.emissive.copy(state.primary).lerp(state.secondary, 0.4);
    surfaces.ambientMaterial.color
      .copy(surfaces.ambientMaterial.emissive)
      .lerp(diffuserSurface, 0.35);
    surfaces.ambientMaterial.emissiveIntensity = illumination * (0.4 - focus * 0.1);
    surfaces.sensorMaterial.emissive
      .copy(state.primary)
      .lerp(state.secondary, 0.3)
      .lerp(neutralSensorLight, sensorEmphasis);
    surfaces.sensorMaterial.emissiveIntensity = illumination * (0.5 + sensorEmphasis * 0.65);
    surfaces.sensorGlass.color.copy(quietSensorGlass).lerp(inspectionSensorGlass, sensorEmphasis);
    surfaces.sensorGlass.emissive.copy(neutralSensorLight);
    surfaces.sensorGlass.emissiveIntensity = illumination * (0.008 + sensorEmphasis * 0.065);
  }

  return {
    applyIllumination(nextState: BayIlluminationState) {
      state.entryProgress = nextState.entryProgress;
      state.capturing = nextState.capturing;
      state.captureDepth = nextState.captureDepth;
      state.primary.copy(nextState.primary);
      state.secondary.copy(nextState.secondary);
      state.focus = nextState.focus;
      state.sensorEmphasis = nextState.sensorEmphasis;
      applyCurrentIllumination();
    },
    applyBrightness(nextIllumination: number) {
      illumination = nextIllumination;
      applyCurrentIllumination();
    },
  };
}
