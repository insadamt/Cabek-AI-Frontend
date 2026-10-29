/**
 * Builds an open CABEK sensor tunnel with satin structure, recessed sensors and operator console.
 * Slim roof members preserve the elevated vehicle view while independent portal diffusers reveal scanning.
 * Depends on Three.js, visual settings, bay illumination and the vector console; owns its GPU resources.
 */
import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Light,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildBayConsole } from './bayConsole';
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

interface SensorPose {
  position: Vector3;
  direction: Vector3;
}

// ============================================================
// Shared manufactured surfaces and resource ownership
// ============================================================

export function buildScanningBay(): ScanningBay {
  const root = new Group();
  root.name = 'CABEK sensor tunnel';
  const canopy = new Group();
  canopy.name = 'Complete louvered canopy';
  const sensorArray = new Group();
  sensorArray.name = 'Integrated sensor windows';
  const overheadSensorArray = new Group();
  overheadSensorArray.name = 'Canopy sensor windows';
  canopy.add(overheadSensorArray);
  root.add(canopy, sensorArray);
  const console = buildBayConsole();
  root.add(console.root);
  const geometries = new Map<string, BufferGeometry>();
  const materials = new Set<Material>();
  const lights: Light[] = [];
  const portals: PortalIllumination[] = [];
  const sensorMeshes: InstancedMesh[] = [];

  function finishMaterial<T extends Material>(material: T): T {
    materials.add(material);
    return material;
  }

  function metal(name: string, color: string, roughness: number, metalness: number) {
    const material = finishMaterial(new MeshStandardMaterial({ color, roughness, metalness }));
    material.name = name;
    return material;
  }

  const graphite = metal('Graphite anodised frame', '#303638', 0.44, 0.66);
  const pearl = finishMaterial(
    new MeshPhysicalMaterial({
      color: '#c3c9ca',
      roughness: 0.4,
      metalness: 0.78,
      anisotropy: 0.28,
      anisotropyRotation: Math.PI / 2,
    }),
  );
  pearl.name = 'Brushed aluminium shell';
  const aluminium = metal('Machined edge detail', '#a5afb2', 0.34, 0.86);
  const deck = metal('Satin drive deck', '#8b9292', 0.68, 0.18);
  const rubber = metal('Recessed diffuser gasket', '#151c20', 0.72, 0.05);
  const ground = metal('Matte studio floor', '#eef0ed', 0.94, 0);
  const sensorGlass = finishMaterial(
    new MeshPhysicalMaterial({
      color: '#112c36',
      roughness: 0.19,
      metalness: 0.06,
      clearcoat: 0.55,
      clearcoatRoughness: 0.11,
      envMapIntensity: 0.9,
    }),
  );
  sensorGlass.name = 'Flush coated sensor glass';
  const sensorOptics = metal('Coated optical apertures', '#071317', 0.16, 0.04);
  function diffuserMaterial(name: string) {
    const material = finishMaterial(
      new MeshStandardMaterial({
        color: '#f0f2e9',
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
  // Flush drive deck and bevelled structural portals
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
  for (const side of [-1, 1]) {
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
    box('Upper structural spine', [0.11, 0.12, 5.8], [side * 1.82, 2.55, 0], graphite, 0.015);
    for (const height of [0.91, 1.92]) {
      box('Continuous sensor rail', [0.09, 0.25, 5.7], [side * 1.81, height, 0], pearl, 0.018);
      box(
        'Sensor rail reveal',
        [0.012, 0.014, 5.55],
        [side * 1.758, height - 0.104, 0],
        rubber,
        0.004,
      );
    }
    for (const depth of [-3.1, -2.25, -1.4, -0.55, 0.3, 1.15, 2, 2.85]) {
      box('Deck drainage joint', [0.27, 0.003, 0.012], [side * 1.57, 0.001, depth], rubber, 0.001);
    }
  }
  for (const depth of [-3.41, 3.41]) {
    box('Flush entry threshold', [3.96, 0.008, 0.035], [0, 0.001, depth], aluminium, 0.003);
  }

  for (const depth of [-2.8, 0, 2.8]) {
    const portalMaterial = diffuserMaterial(`Portal ${depth} scan diffusers`);
    const portal: PortalIllumination = { depth, material: portalMaterial, lights: [] };
    portals.push(portal);
    for (const side of [-1, 1]) {
      box('Portal footing', [0.37, 0.13, 0.48], [side * 1.82, 0.065, depth], graphite, 0.025);
      box(
        'Portal structural upright',
        [0.23, 2.43, 0.25],
        [side * 1.82, 1.335, depth],
        graphite,
        0.028,
      );
      box(
        'Upright satin face',
        [0.16, 2.17, 0.012],
        [side * 1.82, 1.34, depth + 0.13],
        pearl,
        0.006,
      );
      beam(
        'Portal chamfered shoulder',
        [side * 1.82, 2.51, depth],
        [side * 1.42, 2.94, depth],
        0.23,
        0.25,
        graphite,
        0.028,
      );
      box('Inner light gasket', [0.025, 2.0, 0.11], [side * 1.692, 1.36, depth], rubber, 0.006);
      box(
        'Vertical scan diffuser',
        [0.012, 1.94, 0.065],
        [side * 1.674, 1.36, depth],
        portalMaterial,
        0.004,
      );
      beam(
        'Angled scan diffuser',
        [side * 1.668, 2.48, depth],
        [side * 1.365, 2.79, depth],
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
    box('Structural canopy crossmember', [2.85, 0.085, 0.125], [0, 2.96, depth], graphite, 0.018);
    box('Crossmember satin crown', [2.67, 0.008, 0.085], [0, 3.007, depth], pearl, 0.003);
    box('Downward scan diffuser', [2.63, 0.01, 0.04], [0, 2.913, depth], portalMaterial, 0.003);
  }

  // ============================================================
  // Narrow edge panels and spaced louvers keep the roof mostly open
  // ============================================================

  for (const side of [-1, 1]) {
    box(
      'Canopy longitudinal edge panel',
      [0.17, 0.042, 5.6],
      [side * 1.49, 2.99, 0],
      pearl,
      0.017,
      canopy,
    );
    box(
      'Canopy perimeter reveal',
      [0.035, 0.035, 5.61],
      [side * 1.598, 2.955, 0],
      graphite,
      0.008,
      canopy,
    );
    box(
      'Roof underside diffuser',
      [0.025, 0.008, 5.4],
      [side * 1.43, 2.96, 0],
      categoryLight,
      0.003,
      canopy,
    );
  }
  for (let index = 0; index < 6; index += 1) {
    const louver = box(
      'Satin canopy louver',
      [2.76, 0.022, 0.048],
      [0, 3.006, -2.3 + index * (4.6 / 5)],
      pearl,
      0.01,
      canopy,
    );
    louver.rotation.x = -0.16;
  }

  // ============================================================
  // Recessed optical apertures keep the sensor modules within the rail envelope
  // ============================================================

  const sensorPoses: SensorPose[] = [];
  for (const side of [-1, 1]) {
    for (const depth of [-2.13, -0.71, 0.71, 2.13]) {
      for (const height of [0.91, 1.92]) {
        sensorPoses.push({
          position: new Vector3(side * 1.757, height, depth),
          direction: new Vector3(-side, 0, 0),
        });
      }
    }
    for (const depth of [-1.4, 1.4]) {
      sensorPoses.push({
        position: new Vector3(side * 1.49, 2.96, depth),
        direction: new Vector3(0, -1, 0),
      });
    }
  }

  function addSensorInstances(
    name: string,
    geometry: BufferGeometry,
    material: Material,
    normalOffset: number,
    tangentOffset = 0,
  ) {
    geometries.set(name, geometry);
    for (const overhead of [false, true]) {
      const poses = sensorPoses.filter(({ position }) => position.y > 2.5 === overhead);
      const mesh = new InstancedMesh(geometry, material, poses.length);
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const transform = new Object3D();
      const surfaceNormal = new Vector3(0, 1, 0);
      poses.forEach(({ position, direction }, index) => {
        transform.quaternion.copy(new Quaternion().setFromUnitVectors(surfaceNormal, direction));
        transform.position.copy(position).addScaledVector(direction, normalOffset);
        transform.position.add(
          new Vector3(tangentOffset, 0, 0).applyQuaternion(transform.quaternion),
        );
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.computeBoundingSphere();
      sensorMeshes.push(mesh);
      (overhead ? overheadSensorArray : sensorArray).add(mesh);
    }
  }

  //
  // Separate overhead instances disappear with their roof instead of floating in space.
  //
  addSensorInstances(
    'Twenty flush sensor seals',
    new RoundedBoxGeometry(0.208, 0.008, 0.29, 2, 0.004),
    rubber,
    0,
  );
  addSensorInstances(
    'Twenty flat sensor windows',
    new RoundedBoxGeometry(0.181, 0.004, 0.258, 2, 0.002),
    sensorGlass,
    0.006,
  );
  addSensorInstances(
    'Twenty integrated sensor status bars',
    new RoundedBoxGeometry(0.006, 0.004, 0.2, 1, 0.002),
    sensorStatus,
    0.008,
    0.078,
  );
  addSensorInstances(
    'Twenty recessed optical apertures',
    new RoundedBoxGeometry(0.044, 0.003, 0.058, 2, 0.0015),
    sensorOptics,
    0.009,
    -0.035,
  );

  const illumination = createBayIllumination({
    portals,
    ambientMaterial: categoryLight,
    sensorMaterial: sensorStatus,
    sensorGlass,
  });
  function applySettings(settings: BayVisualSettings) {
    canopy.visible = settings.canopyVisible;
    sensorArray.visible = settings.sensorsVisible;
    overheadSensorArray.visible = settings.sensorsVisible;
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
      sensorMeshes.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
