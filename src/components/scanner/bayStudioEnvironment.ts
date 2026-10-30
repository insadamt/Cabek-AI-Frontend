/**
 * Builds neutral automotive softbox reflections so graphite and brushed metal retain readable edges.
 * Depends on Three.js and is captured once by bayScene's PMREM generator; owns its temporary GPU resources.
 */
import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
  type Material,
} from 'three';

interface ReflectionPanel {
  name: string;
  position: readonly [number, number, number];
  size: readonly [number, number];
  radiance: number;
}

// ============================================================
// Rectangular reflections with restrained dark edge definition
// ============================================================

export function createBayStudioEnvironment() {
  const scene = new Scene();
  scene.name = 'Neutral automotive reflection studio';
  scene.background = new Color('#434c56');
  const roomGeometry = new BoxGeometry();
  const panelGeometry = new PlaneGeometry();
  const materials: Material[] = [];
  const roomMaterial = new MeshBasicMaterial({ color: '#434c56', side: BackSide });
  const room = new Mesh(roomGeometry, roomMaterial);
  room.name = 'Neutral studio enclosure';
  room.position.y = 6;
  room.scale.set(32, 24, 36);
  scene.add(room);
  materials.push(roomMaterial);

  function addReflectionCard(panel: ReflectionPanel) {
    const material = new MeshLambertMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveIntensity: panel.radiance,
      side: DoubleSide,
    });
    const card = new Mesh(panelGeometry, material);
    card.name = panel.name;
    card.position.set(...panel.position);
    card.scale.set(...panel.size, 1);
    card.lookAt(0, 0, 0);
    scene.add(card);
    materials.push(material);
  }

  //
  // Long cards produce continuous highlights along the portal beams and vehicle shoulders.
  //
  const panels: ReflectionPanel[] = [
    { name: 'Long overhead softbox', position: [-3, 10, 0], size: [3, 15], radiance: 7 },
    { name: 'Roof edge strip', position: [4, 10, 1], size: [1.4, 13], radiance: 5.5 },
    { name: 'Left side softbox', position: [-10, 5, 1], size: [14, 2], radiance: 5.5 },
    { name: 'Right side softbox', position: [10, 5, -1], size: [14, 1.6], radiance: 4.5 },
    { name: 'Front fill softbox', position: [0, 5, 13], size: [5, 3], radiance: 2.2 },
    { name: 'Rear separation softbox', position: [0, 7, -13], size: [6, 2], radiance: 4 },
  ];
  panels.forEach(addReflectionCard);

  //
  // Narrow dark flags define silver edges without placing visible scenery around the equipment.
  //
  const flagMaterial = new MeshBasicMaterial({ color: '#424b50', side: DoubleSide });
  materials.push(flagMaterial);
  for (const side of [-1, 1]) {
    const flag = new Mesh(panelGeometry, flagMaterial);
    flag.name = 'Vertical studio contrast flag';
    flag.position.set(side * 11, 2, 8);
    flag.scale.set(1.8, 7, 1);
    flag.lookAt(new Vector3());
    scene.add(flag);
  }

  let disposed = false;
  return {
    scene,
    dispose() {
      if (disposed) return;
      disposed = true;
      roomGeometry.dispose();
      panelGeometry.dispose();
      materials.forEach((material) => material.dispose());
      scene.clear();
    },
  };
}
