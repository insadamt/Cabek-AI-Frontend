/**
 * Builds compact industrial cameras with recessed optics, service fasteners and passive cooling details.
 * Shared instances preserve vehicle clearance and let roof cameras follow canopy visibility at low draw cost.
 * Depends on Three.js and caller-owned PBR materials; owns camera geometry and instance buffers.
 */
import {
  BufferGeometry,
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Material,
  Object3D,
  Quaternion,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

interface OpticalCameraMaterials {
  housing: Material;
  gasket: Material;
  face: Material;
  lens: Material;
  aperture: Material;
  status: Material;
}

interface OpticalCameraPose {
  position: Vector3;
  direction: Vector3;
  overhead: boolean;
}

interface CameraPart {
  name: string;
  geometry: BufferGeometry;
  material: Material;
  localPositions: [number, number, number][];
}

//
// Short operator-side rails expose the doors and wheels as in the supplied equipment reference.
// Camera positions and mounting sections share this layout to prevent unsupported sensor bodies.
//
export const opticalRailLayouts = [
  { side: -1, sections: [{ depth: 0, length: 5.7 }], cameraDepths: [-2.13, -0.71, 0.71, 2.13] },
  {
    side: 1,
    sections: [
      { depth: -2.35, length: 1 },
      { depth: 2.35, length: 1 },
    ],
    cameraDepths: [-2.45, -2.05, 2.05, 2.45],
  },
] as const;

// ============================================================
// Rail-mounted cameras retain safe clearance around the moving sedan
// ============================================================

function createCameraPoses(): OpticalCameraPose[] {
  const poses: OpticalCameraPose[] = [];
  for (const { side, cameraDepths } of opticalRailLayouts) {
    for (const depth of cameraDepths) {
      for (const height of [0.91, 1.92]) {
        poses.push({
          position: new Vector3(side * 1.755, height, depth),
          direction: new Vector3(-side, 0, 0),
          overhead: false,
        });
      }
    }
    for (const depth of [-1.4, 1.4]) {
      poses.push({
        position: new Vector3(side * 1.49, 2.6, depth),
        direction: new Vector3(0, -1, 0),
        overhead: true,
      });
    }
  }
  return poses;
}

export function buildBaySensors(materials: OpticalCameraMaterials) {
  const sideArray = new Group();
  sideArray.name = 'Side optical camera array';
  const overheadArray = new Group();
  overheadArray.name = 'Overhead optical camera array';
  const poses = createCameraPoses();
  const geometries: BufferGeometry[] = [];
  const instances: InstancedMesh[] = [];
  const surfaceNormal = new Vector3(0, 1, 0);

  function addCameraPart({ name, geometry, material, localPositions }: CameraPart) {
    geometries.push(geometry);
    for (const overhead of [false, true]) {
      const selectedPoses = poses.filter((pose) => pose.overhead === overhead);
      const mesh = new InstancedMesh(
        geometry,
        material,
        selectedPoses.length * localPositions.length,
      );
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const transform = new Object3D();
      selectedPoses.forEach(({ position, direction }, cameraIndex) => {
        const orientation = new Quaternion().setFromUnitVectors(surfaceNormal, direction);
        localPositions.forEach((localPosition, partIndex) => {
          transform.quaternion.copy(orientation);
          transform.position.fromArray(localPosition).applyQuaternion(orientation).add(position);
          transform.updateMatrix();
          mesh.setMatrixAt(cameraIndex * localPositions.length + partIndex, transform.matrix);
        });
      });
      mesh.computeBoundingSphere();
      instances.push(mesh);
      (overhead ? overheadArray : sideArray).add(mesh);
    }
  }

  addCameraPart({
    name: 'Camera isolation mounts',
    geometry: new RoundedBoxGeometry(0.22, 0.018, 0.25, 2, 0.005),
    material: materials.gasket,
    localPositions: [[0, 0, 0]],
  });
  addCameraPart({
    name: 'Machined optical camera housings',
    geometry: new RoundedBoxGeometry(0.212, 0.126, 0.234, 2, 0.006),
    material: materials.housing,
    localPositions: [[0, 0.065, 0]],
  });
  addCameraPart({
    name: 'Recessed camera faceplates',
    geometry: new RoundedBoxGeometry(0.183, 0.008, 0.204, 2, 0.004),
    material: materials.face,
    localPositions: [[0, 0.131, 0]],
  });
  addCameraPart({
    name: 'Anodised lens seats',
    geometry: new CylinderGeometry(0.059, 0.063, 0.01, 32),
    material: materials.aperture,
    localPositions: [[0, 0.139, 0]],
  });

  //
  // Nested optical surfaces catch different reflections without extending a lens barrel into the lane.
  // Retaining rings are metal; only the small ready indicator emits light on real camera hardware.
  //
  const lensRing = new TorusGeometry(0.051, 0.002, 6, 32);
  lensRing.rotateX(-Math.PI / 2);
  addCameraPart({
    name: 'Optical lens retaining rings',
    geometry: lensRing,
    material: materials.housing,
    localPositions: [[0, 0.146, 0]],
  });
  addCameraPart({
    name: 'Coated camera lenses',
    geometry: new CylinderGeometry(0.037, 0.045, 0.004, 32),
    material: materials.lens,
    localPositions: [[0, 0.146, 0]],
  });
  addCameraPart({
    name: 'Camera iris apertures',
    geometry: new CylinderGeometry(0.022, 0.025, 0.002, 24),
    material: materials.aperture,
    localPositions: [[0, 0.149, 0]],
  });
  addCameraPart({
    name: 'Recessed objective elements',
    geometry: new CylinderGeometry(0.014, 0.019, 0.001, 24),
    material: materials.lens,
    localPositions: [[0, 0.1505, 0]],
  });
  addCameraPart({
    name: 'Camera ready indicators',
    geometry: new RoundedBoxGeometry(0.005, 0.003, 0.012, 1, 0.0015),
    material: materials.status,
    localPositions: [[0.075, 0.138, 0]],
  });

  // ============================================================
  // Small service details share instance buffers across the complete array
  // ============================================================

  const faceScrewPositions: [number, number, number][] = [];
  const ventPositions: [number, number, number][] = [];
  for (const side of [-1, 1]) {
    for (const depth of [-0.081, 0.081]) faceScrewPositions.push([side * 0.072, 0.136, depth]);
    for (const depth of [-0.066, -0.044, -0.022, 0, 0.022, 0.044, 0.066]) {
      ventPositions.push([side * 0.106, 0.066, depth]);
    }
  }
  addCameraPart({
    name: 'Camera countersunk fastener seats',
    geometry: new CylinderGeometry(0.006, 0.006, 0.001, 12),
    material: materials.gasket,
    localPositions: faceScrewPositions,
  });
  addCameraPart({
    name: 'Camera socket fasteners',
    geometry: new CylinderGeometry(0.0038, 0.0045, 0.002, 6),
    material: materials.housing,
    localPositions: faceScrewPositions,
  });
  addCameraPart({
    name: 'Camera heat sink recesses',
    geometry: new BoxGeometry(0.001, 0.045, 0.004),
    material: materials.gasket,
    localPositions: ventPositions,
  });
  const connector = new CylinderGeometry(0.008, 0.009, 0.014, 8);
  connector.rotateX(Math.PI / 2);
  addCameraPart({
    name: 'Camera sealed cable glands',
    geometry: connector,
    material: materials.face,
    localPositions: [[0.075, 0.025, 0.115]],
  });
  const cablePath = new CatmullRomCurve3([
    new Vector3(0.075, 0.025, 0.12),
    new Vector3(0.025, 0, 0.12),
    new Vector3(-0.045, -0.003, 0.12),
    new Vector3(-0.075, 0.004, 0.1),
  ]);
  addCameraPart({
    name: 'Camera protected rear signal leads',
    geometry: new TubeGeometry(cablePath, 8, 0.003, 5, false),
    material: materials.gasket,
    localPositions: [[0, 0, 0]],
  });

  let disposed = false;
  return {
    sideArray,
    overheadArray,
    dispose() {
      if (disposed) return;
      disposed = true;
      instances.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      sideArray.removeFromParent();
      overheadArray.removeFromParent();
      sideArray.clear();
      overheadArray.clear();
    },
  };
}
