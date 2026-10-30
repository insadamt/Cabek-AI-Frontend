/**
 * Builds a bolted operator pedestal and dark industrial touch display that stays readable in studio light.
 * Depends on Three.js, its bundled font and visual settings; owns its exportable geometry and PBR finishes.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShapeGeometry,
} from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { defaultBayVisualSettings, type BayVisualSettings } from './bayControls';

export function buildBayConsole() {
  const root = new Group();
  root.name = 'CABEK tunnel operator console';
  root.position.set(2.28, 0, 1.87);
  const screen = new Group();
  screen.position.set(0, 1.3, 0);
  screen.rotation.set(-0.64, 2.45, 0, 'YXZ');
  screen.scale.setScalar(0.88);
  root.add(screen);
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];
  const font = new FontLoader().parse(fontData);

  function surface(color: string, metalness = 0, emissiveIntensity = 0) {
    const material = new MeshStandardMaterial({
      color,
      roughness: metalness ? 0.32 : 0.6,
      metalness,
      emissive: color,
      emissiveIntensity,
    });
    materials.push(material);
    return material;
  }
  const graphite = surface('#161b1e', 0.35);
  graphite.roughness = 0.36;
  const gasket = surface('#080c0d');
  gasket.roughness = 0.78;
  const alloy = new MeshPhysicalMaterial({
    color: '#a4abad',
    roughness: 0.29,
    metalness: 0.92,
    anisotropy: 0.42,
  });
  const glass = new MeshPhysicalMaterial({
    color: '#010304',
    roughness: 0.16,
    metalness: 0,
    specularIntensity: 0.25,
    clearcoat: 0.24,
    clearcoatRoughness: 0.13,
    envMapIntensity: 0.28,
  });
  glass.name = 'Anti-reflective black touch glass';
  materials.push(alloy, glass);

  //
  // Display pixels emit their own light; a black diffuse base prevents studio lights washing out the UI.
  //
  function displayInk(color: string, brightness: number) {
    const material = surface('#000000');
    material.emissive.set(color);
    material.emissiveIntensity = brightness;
    material.toneMapped = false;
    return material;
  }
  const paleText = displayInk('#d1dcd9', 0.7);
  const muted = displayInk('#52635f', 0.65);
  const accent = displayInk('#b4df85', 0.72);
  const sensors = displayInk('#b4df85', 0.72);
  const canopy = displayInk('#b4df85', 0.72);

  function box(
    parent: Group,
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: MeshStandardMaterial,
    radius = 0.012,
  ) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((value) => value / 2)))
      : new BoxGeometry(...size);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = material === graphite || material === alloy;
    mesh.receiveShadow = mesh.castShadow;
    parent.add(mesh);
    return mesh;
  }
  function label(text: string, x: number, y: number, size: number, material = paleText) {
    const geometry = new ShapeGeometry(font.generateShapes(text, size), 2);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = `Console label ${text}`;
    mesh.position.set(x, y, 0.075);
    screen.add(mesh);
  }
  function bolt(parent: Group, position: [number, number, number], onScreen = false) {
    const geometry = new CylinderGeometry(0.009, 0.011, 0.005, 6);
    if (onScreen) geometry.rotateX(Math.PI / 2);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, alloy);
    mesh.name = 'Console captive service fastener';
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
  }

  // ============================================================
  // A serviceable metal pedestal with the display aimed toward the operator
  // ============================================================

  box(root, 'Console weighted foot', [0.72, 0.08, 0.58], [0, 0.04, 0], graphite, 0.012);
  box(root, 'Console floor isolation pad', [0.66, 0.012, 0.52], [0, 0.008, 0], gasket, 0.008);
  box(root, 'Console bolted baseplate', [0.59, 0.014, 0.45], [0, 0.087, 0], alloy, 0.004);
  for (const side of [-1, 1]) {
    for (const depth of [-0.18, 0.18]) {
      box(
        root,
        'Console anchor cap',
        [0.025, 0.012, 0.025],
        [side * 0.25, 0.1, depth],
        graphite,
        0.004,
      );
      bolt(root, [side * 0.25, 0.108, depth]);
    }
  }
  box(root, 'Console pedestal weld collar', [0.25, 0.06, 0.25], [0, 0.117, 0], graphite, 0.006);
  box(root, 'Console stainless riser', [0.15, 1.08, 0.17], [0, 0.64, 0], alloy, 0.006);
  box(root, 'Console cable cover', [0.178, 0.97, 0.055], [0, 0.635, 0.073], graphite, 0.006);
  box(root, 'Console rear service access', [0.135, 0.32, 0.004], [0, 0.33, 0.103], graphite, 0.004);
  for (const side of [-1, 1]) {
    for (const height of [0.19, 0.47]) bolt(root, [side * 0.05, height, 0.108], true);
  }
  box(screen, 'Console display mounting plate', [0.28, 0.24, 0.024], [0, -0.075, -0.057], graphite);
  box(screen, 'Console adjustable tilt hinge', [0.23, 0.08, 0.12], [0, -0.14, -0.113], alloy);
  box(screen, 'Console aluminium enclosure', [0.96, 0.72, 0.09], [0, 0, 0], alloy, 0.018);
  box(screen, 'Console sealed bezel joint', [0.938, 0.698, 0.008], [0, 0, 0.044], gasket, 0.016);
  box(screen, 'Console protective bezel', [0.924, 0.684, 0.02], [0, 0, 0.052], graphite, 0.014);
  box(screen, 'Console dark touch glass', [0.84, 0.59, 0.012], [0, 0, 0.065], glass, 0.008);
  for (const side of [-1, 1]) {
    for (const height of [-0.31, 0.31]) bolt(screen, [side * 0.437, height, 0.064], true);
    for (const height of [-0.27, 0.27]) bolt(screen, [side * 0.41, height, -0.047], true);
  }
  for (let slot = 0; slot < 7; slot += 1) {
    box(
      screen,
      'Console rear cooling slot',
      [0.18, 0.006, 0.002],
      [0.285, -0.09 + slot * 0.027, -0.046],
      gasket,
      0.002,
    );
  }
  label('CABEK', -0.37, 0.21, 0.057);
  label('TUNNEL / 3D', 0.015, 0.22, 0.028, accent);
  box(screen, 'Console header rule', [0.74, 0.002, 0.002], [0, 0.164, 0.075], muted, 0);
  label('ECLAIRAGE', -0.37, 0.105, 0.035);
  box(screen, 'Console brightness track', [0.71, 0.024, 0.003], [-0.015, 0.047, 0.075], muted);
  const illumination = box(
    screen,
    'Console brightness indicator',
    [0.71, 0.024, 0.004],
    [-0.015, 0.047, 0.078],
    accent,
  );
  label('CAPTEURS', -0.37, -0.06, 0.035);
  label('TOITURE', -0.37, -0.164, 0.035);
  for (const y of [-0.048, -0.152]) {
    box(screen, 'Console switch track', [0.14, 0.044, 0.003], [0.284, y, 0.075], muted);
  }
  const sensorToggle = box(
    screen,
    'Sensor display switch',
    [0.057, 0.03, 0.004],
    [0.32, -0.048, 0.079],
    sensors,
  );
  const canopyToggle = box(
    screen,
    'Canopy display switch',
    [0.057, 0.03, 0.004],
    [0.32, -0.152, 0.079],
    canopy,
  );
  label('CONTROLE DU TUNNEL', -0.37, -0.259, 0.021, muted);

  function applySettings(settings: BayVisualSettings) {
    illumination.scale.x = settings.illumination;
    illumination.position.x = -0.37 + (0.71 * settings.illumination) / 2;
    sensorToggle.position.x = settings.sensorsVisible ? 0.32 : 0.248;
    canopyToggle.position.x = settings.canopyVisible ? 0.32 : 0.248;
    sensors.emissive.set(settings.sensorsVisible ? '#b4df85' : '#52635f');
    canopy.emissive.set(settings.canopyVisible ? '#b4df85' : '#52635f');
  }
  applySettings(defaultBayVisualSettings);
  let disposed = false;
  return {
    root,
    applySettings,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
