/**
 * Builds the reference-inspired CABEK tunnel with graphite portals, silver rails and a brushed metal deck.
 * An open perimeter roof reveals the vehicle while inset lime strips describe the industrial scanner.
 * Depends on Three.js, baySensors, visual settings, illumination and the vector console; owns GPU resources.
 */
import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Light,
  Material,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildBayConsole } from './bayConsole';
import { buildBayHardware } from './bayHardware';
import { applyBaySurfaceFinish } from './baySurfaceFinish';
import { buildBaySensors, opticalRailLayouts } from './baySensors';
import { defaultBayVisualSettings, type BayVisualSettings } from './bayControls';
import {
  createBayIllumination,
  type BayIlluminationState,
  type PortalIllumination,
} from './bayIllumination';

export interface ScanningBay {
  root: Group;
  lights: Light[];
  emissiveMaterials: MeshStandardMaterial[];
  applyIllumination: (state: BayIlluminationState) => void;
  applySettings: (settings: BayVisualSettings) => void;
  dispose: () => void;
}

type Dimensions = readonly [number, number, number];
type Position = readonly [number, number, number];

// ============================================================
// Shared manufactured surfaces and resource ownership
// ============================================================

export function buildScanningBay(): ScanningBay {
  const root = new Group();
  root.name = 'CABEK sensor tunnel';
  const canopy = new Group();
  canopy.name = 'Open perimeter canopy';
  root.add(canopy);
  const console = buildBayConsole();
  root.add(console.root);
  const geometries = new Map<string, BufferGeometry>();
  const materials = new Set<Material>();
  const lights: Light[] = [];
  const portals: PortalIllumination[] = [];
  const instanceMeshes: InstancedMesh[] = [];

  function finishMaterial<T extends Material>(material: T): T {
    materials.add(material);
    return material;
  }

  function metal(name: string, color: string, roughness: number, metalness: number) {
    const material = finishMaterial(new MeshStandardMaterial({ color, roughness, metalness }));
    material.name = name;
    return material;
  }

  const graphite = metal('Graphite powder coated frame', '#141719', 0.34, 0.04);
  const pearl = finishMaterial(
    new MeshPhysicalMaterial({
      color: '#30363a',
      roughness: 0.28,
      metalness: 0.92,
      anisotropy: 0.4,
      anisotropyRotation: Math.PI / 2,
    }),
  );
  pearl.name = 'Brushed aluminium shell';
  const aluminium = metal('Machined edge detail', '#707a80', 0.245, 0.95);
  const deck = finishMaterial(
    new MeshPhysicalMaterial({
      color: '#454e54',
      roughness: 0.305,
      metalness: 0.88,
      anisotropy: 0.5,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1,
    }),
  );
  deck.name = 'Brushed stainless drive deck';
  applyBaySurfaceFinish(graphite, 'powder');
  applyBaySurfaceFinish(pearl, 'brushed');
  applyBaySurfaceFinish(aluminium, 'brushed');
  applyBaySurfaceFinish(deck, 'deck');
  const rubber = metal('Recessed diffuser gasket', '#151c20', 0.72, 0.05);
  const ground = metal('Matte studio floor', '#eef0ed', 0.94, 0);
  const sensorGlass = finishMaterial(
    new MeshPhysicalMaterial({
      color: '#112c36',
      roughness: 0.09,
      metalness: 0.06,
      clearcoat: 0.55,
      clearcoatRoughness: 0.11,
      envMapIntensity: 0.9,
    }),
  );
  sensorGlass.name = 'Coated optical camera glass';
  const cameraFace = metal('Camera graphite faceplates', '#252b2a', 0.35, 0.42);
  const sensorOptics = metal('Coated optical apertures', '#071317', 0.16, 0.04);
  function diffuserMaterial(name: string) {
    const material = finishMaterial(
      new MeshStandardMaterial({
        color: '#cbea9e',
        emissive: new Color('#b8f36b'),
        roughness: 0.4,
        metalness: 0,
      }),
    );
    material.name = name;
    return material;
  }
  const categoryLight = diffuserMaterial('Embedded guidance and roof diffusers');
  const sensorStatus = diffuserMaterial('Sensor status illumination');

  function roundedGeometry(size: Dimensions, radius = 0.015): BufferGeometry {
    const bevelRadius = Math.min(radius, ...size.map((value) => value / 2));
    const key = `${size.join(':')}:${bevelRadius}`;
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = new RoundedBoxGeometry(...size, 3, bevelRadius);
      geometries.set(key, geometry);
    }
    return geometry;
  }

  function addMesh(name: string, geometry: BufferGeometry, material: Material): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }

  function box(
    name: string,
    size: Dimensions,
    position: Position,
    material: Material,
    radius = 0.015,
    parent: Group = root,
  ): Mesh {
    const mesh = addMesh(name, roundedGeometry(size, radius), material);
    mesh.position.set(...position);
    if (parent !== root) parent.add(mesh);
    return mesh;
  }

  function beam(
    name: string,
    start: Position,
    end: Position,
    width: number,
    depth: number,
    material: Material,
    radius = 0.015,
  ) {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    const mesh = box(name, [width, direction.length(), depth], [0, 0, 0], material, radius);
    mesh.position.copy(from.add(to).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  // ============================================================
  // Flush stainless deck with service channels and bolted structural portals
  // ============================================================

  const floorGeometry = new PlaneGeometry(100, 100);
  geometries.set('studio-floor', floorGeometry);
  const floor = addMesh('Studio floor', floorGeometry, ground);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.castShadow = false;

  //
  // A flush top keeps the tyres on Y=0 throughout the approach and parking motion.
  //
  box('Recessed deck foundation', [4.35, 0.12, 7.15], [0, -0.066, 0], graphite, 0.045);
  box('Flush drive surface', [4.04, 0.024, 6.94], [0, -0.012, 0], deck, 0.01);
  //
  // Drainage detail shares one draw call so the extra industrial detail stays practical on phones.
  //
  const drainageSlots = new InstancedMesh(
    roundedGeometry([0.145, 0.003, 0.012], 0.001),
    rubber,
    88,
  );
  drainageSlots.name = 'Recessed drainage grate slots';
  root.add(drainageSlots);
  instanceMeshes.push(drainageSlots);
  let drainageSlotIndex = 0;
  for (const { side, sections } of opticalRailLayouts) {
    box('Deck perimeter bead', [0.035, 0.012, 6.88], [side * 2.04, 0.002, 0], aluminium, 0.004);
    box('Guidance strip recess', [0.033, 0.006, 6.54], [side * 1.16, 0.001, 0], rubber, 0.003);
    box('Deck inset edge reveal', [0.016, 0.005, 6.86], [side * 2.008, 0.001, 0], rubber, 0.002);
    box(
      'Inlaid wheel guidance',
      [0.014, 0.005, 6.5],
      [side * 1.16, 0.003, 0],
      categoryLight,
      0.002,
    );
    box('Lower equipment trunk', [0.25, 0.31, 5.94], [side * 1.91, 0.22, 0], graphite, 0.03);
    box('Equipment trunk cap', [0.27, 0.025, 5.89], [side * 1.91, 0.39, 0], pearl, 0.009);
    box('Service channel grate', [0.18, 0.008, 6.6], [side * 1.57, 0.003, 0], graphite, 0.002);
    box('Upper structural spine', [0.11, 0.12, 5.8], [side * 1.82, 2.19, 0], graphite, 0.006);
    for (const height of [0.91, 1.92]) {
      for (const { depth, length } of sections) {
        box(
          'Silver optical mounting rail',
          [0.11, 0.3, length],
          [side * 1.81, height, depth],
          pearl,
          0.009,
        );
        box(
          'Sensor rail reveal',
          [0.012, 0.014, length - 0.1],
          [side * 1.749, height - 0.133, depth],
          rubber,
          0.004,
        );
      }
    }
    for (let index = 0; index < 44; index += 1) {
      drainageSlots.setMatrixAt(
        drainageSlotIndex++,
        new Matrix4().makeTranslation(side * 1.57, 0.008, -3.2 + index * 0.149),
      );
    }
    for (const depth of [-2.3, 2.3]) {
      box(
        'Rail mounting stanchion',
        [0.065, 1.8, 0.075],
        [side * 1.875, 1.21, depth],
        aluminium,
        0.009,
      );
    }
    for (const depth of [-1.15, 1.15]) {
      box('Deck panel expansion joint', [2.95, 0.002, 0.008], [0, 0.001, depth], rubber, 0.001);
    }
  }
  drainageSlots.computeBoundingSphere();
  for (const depth of [-3.41, 3.41]) {
    box('Flush entry threshold', [3.96, 0.008, 0.035], [0, 0.001, depth], aluminium, 0.003);
  }

  for (const depth of [-2.8, 0, 2.8]) {
    const portalMaterial = diffuserMaterial(`Portal ${depth} scan diffusers`);
    const portal: PortalIllumination = { depth, material: portalMaterial, lights: [] };
    portals.push(portal);
    for (const side of [-1, 1]) {
      box('Portal footing', [0.45, 0.08, 0.57], [side * 1.82, 0.04, depth], graphite, 0.012);
      box('Cast portal plinth', [0.31, 0.23, 0.36], [side * 1.82, 0.19, depth], aluminium, 0.018);
      box(
        'Portal structural upright',
        [0.25, 2.07, 0.29],
        [side * 1.82, 1.155, depth],
        graphite,
        0.012,
      );
      box(
        'Upright recessed face',
        [0.15, 1.77, 0.008],
        [side * 1.82, 1.21, depth - 0.149],
        rubber,
        0.003,
      );
      beam(
        'Portal chamfered shoulder',
        [side * 1.82, 2.15, depth],
        [side * 1.42, 2.58, depth],
        0.25,
        0.29,
        graphite,
        0.012,
      );
      box('Inner light gasket', [0.025, 1.64, 0.11], [side * 1.692, 1.18, depth], rubber, 0.006);
      box(
        'Vertical scan diffuser',
        [0.012, 1.58, 0.065],
        [side * 1.674, 1.18, depth],
        portalMaterial,
        0.004,
      );
      box(
        'Portal front light gasket',
        [0.068, 1.65, 0.006],
        [side * 1.82, 1.21, depth - 0.155],
        rubber,
        0.004,
      );
      box(
        'Portal front lime inlay',
        [0.036, 1.59, 0.008],
        [side * 1.82, 1.21, depth - 0.16],
        portalMaterial,
        0.003,
      );
      beam(
        'Angled scan diffuser',
        [side * 1.668, 2.12, depth],
        [side * 1.365, 2.43, depth],
        0.016,
        0.06,
        portalMaterial,
        0.004,
      );
      const light = new PointLight('#b8f36b', 10, 4.2, 2);
      light.name = 'Diffuser illumination';
      light.position.set(side * 1.48, 1.8, depth);
      root.add(light);
      lights.push(light);
      portal.lights.push(light);
    }
    box('Structural canopy crossmember', [2.85, 0.18, 0.29], [0, 2.58, depth], graphite, 0.007);
    box('Crossmember satin crown', [2.67, 0.008, 0.25], [0, 2.674, depth], pearl, 0.003);
    box('Downward scan diffuser', [2.63, 0.01, 0.04], [0, 2.484, depth], portalMaterial, 0.003);
  }

  // ============================================================
  // Long silver extrusions leave the reference tunnel's crown open
  // ============================================================

  for (const side of [-1, 1]) {
    box(
      'Canopy longitudinal edge panel',
      [0.17, 0.042, 5.6],
      [side * 1.49, 2.63, 0],
      pearl,
      0.017,
      canopy,
    );
    box(
      'Canopy perimeter reveal',
      [0.035, 0.035, 5.61],
      [side * 1.598, 2.595, 0],
      graphite,
      0.008,
      canopy,
    );
    box(
      'Roof underside diffuser',
      [0.025, 0.008, 5.4],
      [side * 1.43, 2.6, 0],
      categoryLight,
      0.003,
      canopy,
    );
  }
  const sensors = buildBaySensors({
    housing: pearl,
    gasket: rubber,
    face: cameraFace,
    lens: sensorGlass,
    aperture: sensorOptics,
    status: sensorStatus,
  });
  root.add(sensors.sideArray);
  canopy.add(sensors.overheadArray);
  const hardware = buildBayHardware({ metal: aluminium, graphite, recess: rubber });
  root.add(hardware.root);

  const illumination = createBayIllumination({
    portals,
    ambientMaterial: categoryLight,
    sensorMaterial: sensorStatus,
    sensorGlass,
  });
  function applySettings(settings: BayVisualSettings) {
    canopy.visible = settings.canopyVisible;
    sensors.sideArray.visible = settings.sensorsVisible;
    sensors.overheadArray.visible = settings.sensorsVisible;
    illumination.applyBrightness(settings.illumination);
    console.applySettings(settings);
  }
  applySettings(defaultBayVisualSettings);

  let disposed = false;
  return {
    root,
    lights,
    emissiveMaterials: [categoryLight, sensorStatus, ...portals.map(({ material }) => material)],
    applyIllumination: illumination.applyIllumination,
    applySettings,
    dispose() {
      if (disposed) return;
      disposed = true;
      console.dispose();
      sensors.dispose();
      hardware.dispose();
      instanceMeshes.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
