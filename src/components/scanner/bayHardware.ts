/**
 * Adds the scanner's assembly joints, service covers and captive fasteners at manufactured scale.
 * These small connections give the frame believable construction instead of uninterrupted box surfaces.
 * Depends on Three.js and caller-owned materials; owns shared geometry and instanced buffers.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

interface HardwareMaterials {
  metal: Material;
  graphite: Material;
  recess: Material;
}

type Position = [number, number, number];

export function buildBayHardware(materials: HardwareMaterials) {
  const root = new Group();
  root.name = 'Serviceable scanner connections';
  const geometries: BufferGeometry[] = [];
  const instances: InstancedMesh[] = [];

  function addParts(
    name: string,
    geometry: BufferGeometry,
    material: Material,
    positions: Position[],
  ) {
    const mesh = new InstancedMesh(geometry, material, positions.length);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const matrix = new Matrix4();
    positions.forEach((position, index) =>
      mesh.setMatrixAt(index, matrix.makeTranslation(...position)),
    );
    mesh.computeBoundingSphere();
    root.add(mesh);
    geometries.push(geometry);
    instances.push(mesh);
  }

  // ============================================================
  // Joint seams and fasteners distinguish separate fabricated assemblies
  // ============================================================

  const frontBolts: Position[] = [];
  const floorBolts: Position[] = [];
  const crownPlates: Position[] = [];
  const plinthSeams: Position[] = [];
  const uprightSeams: Position[] = [];
  const cornerStrips: Position[] = [];
  for (const depth of [-2.8, 0, 2.8]) {
    for (const side of [-1, 1]) {
      crownPlates.push([side * 1.405, 2.684, depth]);
      plinthSeams.push([side * 1.82, 0.303, depth]);
      uprightSeams.push([side * 1.82, 2.07, depth - 0.147]);
      for (const edge of [-1, 1]) {
        cornerStrips.push([side * 1.82 + edge * 0.105, 1.19, depth - 0.149]);
        for (const height of [0.4, 2.03])
          frontBolts.push([side * 1.82 + edge * 0.09, height, depth - 0.154]);
        for (const z of [-0.21, 0.21])
          floorBolts.push([side * 1.82 + edge * 0.17, 0.082, depth + z]);
      }
    }
  }
  addParts(
    'Portal assembly joint seals',
    new BoxGeometry(0.25, 0.006, 0.004),
    materials.recess,
    uprightSeams,
  );
  addParts(
    'Folded frame edge beads',
    new BoxGeometry(0.006, 1.67, 0.004),
    materials.metal,
    cornerStrips,
  );
  addParts(
    'Cast plinth gasket seams',
    new RoundedBoxGeometry(0.306, 0.006, 0.354, 1, 0.002),
    materials.recess,
    plinthSeams,
  );
  addParts(
    'Crown connection cover plates',
    new RoundedBoxGeometry(0.2, 0.012, 0.25, 2, 0.004),
    materials.metal,
    crownPlates,
  );

  const washer = new CylinderGeometry(0.018, 0.018, 0.003, 16);
  addParts('Foundation anchor washers', washer, materials.metal, floorBolts);
  const anchorHead = new CylinderGeometry(0.011, 0.011, 0.012, 6);
  anchorHead.translate(0, 0.006, 0);
  addParts('Foundation hex anchor heads', anchorHead, materials.graphite, floorBolts);
  const faceWasher = new CylinderGeometry(0.01, 0.01, 0.002, 16);
  faceWasher.rotateX(Math.PI / 2);
  const faceScrew = new CylinderGeometry(0.0055, 0.006, 0.004, 6);
  faceScrew.rotateX(Math.PI / 2);
  addParts('Frame countersunk screw seats', faceWasher, materials.recess, frontBolts);
  addParts('Frame stainless socket screws', faceScrew, materials.metal, frontBolts);

  //
  // Continuous cable trunks need removable covers and panel breaks to read as serviceable equipment.
  //
  const covers: Position[] = [];
  const sillJoints: Position[] = [];
  const railCaps: Position[] = [];
  for (const side of [-1, 1]) {
    for (const depth of [-1.4, 1.4]) {
      covers.push([side * 2.038, 0.23, depth]);
      sillJoints.push([side * 1.91, 0.224, depth]);
    }
    for (const depth of [-2.86, 2.86]) {
      for (const height of [0.91, 1.92]) railCaps.push([side * 1.81, height, depth]);
    }
  }
  addParts(
    'Cable trunk access covers',
    new RoundedBoxGeometry(0.007, 0.19, 0.35, 2, 0.003),
    materials.metal,
    covers,
  );
  addParts(
    'Cable trunk segment joints',
    new BoxGeometry(0.254, 0.31, 0.007),
    materials.recess,
    sillJoints,
  );
  addParts(
    'Sensor rail closed end caps',
    new RoundedBoxGeometry(0.115, 0.304, 0.012, 2, 0.003),
    materials.metal,
    railCaps,
  );

  let disposed = false;
  return {
    root,
    dispose() {
      if (disposed) return;
      disposed = true;
      instances.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
