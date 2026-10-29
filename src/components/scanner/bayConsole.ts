/**
 * Builds the tunnel's physical operator pedestal and a high-contrast French control display.
 * Depends on Three.js, its bundled font and visual settings; every mesh exports to Blender without DOM or textures.
 */
import {
  BoxGeometry,
  BufferGeometry,
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
  const graphite = surface('#293135', 0.6);
  graphite.roughness = 0.44;
  const alloy = new MeshPhysicalMaterial({
    color: '#aeb8bb',
    roughness: 0.4,
    metalness: 0.82,
    anisotropy: 0.28,
  });
  const glass = new MeshPhysicalMaterial({
    color: '#0b1d23',
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.65,
  });
  materials.push(alloy, glass);
  const paleText = surface('#edf4ed', 0, 0.85);
  const muted = surface('#50656b', 0, 0.35);
  const accent = surface('#bcf17c', 0, 0.95);
  const sensors = surface('#bcf17c', 0, 0.95);
  const canopy = surface('#bcf17c', 0, 0.95);

  //
  // Emissive screen text keeps its contrast as physical studio lighting changes.
  //
  for (const material of [paleText, muted, accent, sensors, canopy]) {
    material.toneMapped = false;
  }

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

  // ============================================================
  // A serviceable metal pedestal with the display aimed toward the operator
  // ============================================================

  box(root, 'Console weighted foot', [0.72, 0.08, 0.58], [0, 0.04, 0], graphite, 0.035);
  box(root, 'Console bolted baseplate', [0.59, 0.014, 0.45], [0, 0.087, 0], alloy, 0.012);
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
    }
  }
  box(root, 'Console stainless riser', [0.105, 1.05, 0.14], [0, 0.6, 0], alloy);
  box(root, 'Console cable cover', [0.065, 0.86, 0.025], [0, 0.61, 0.083], graphite);
  box(screen, 'Console display mounting plate', [0.28, 0.24, 0.024], [0, -0.075, -0.057], graphite);
  box(screen, 'Console adjustable tilt hinge', [0.23, 0.08, 0.12], [0, -0.14, -0.113], alloy);
  box(screen, 'Console aluminium enclosure', [0.96, 0.72, 0.09], [0, 0, 0], alloy, 0.036);
  box(screen, 'Console protective bezel', [0.91, 0.67, 0.022], [0, 0, 0.049], graphite, 0.026);
  box(screen, 'Console dark touch glass', [0.84, 0.59, 0.012], [0, 0, 0.065], glass, 0.015);
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
    sensors.color.set(settings.sensorsVisible ? '#bcf17c' : '#50656b');
    sensors.emissive.copy(sensors.color);
    canopy.color.set(settings.canopyVisible ? '#bcf17c' : '#50656b');
    canopy.emissive.copy(canopy.color);
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
