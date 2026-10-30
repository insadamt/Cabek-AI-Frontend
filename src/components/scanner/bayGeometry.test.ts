/**
 * Verifies the open tunnel architecture, independent portal lighting and shared GPU resource ownership.
 * Depends on the real Three.js mesh builder without WebGL, DOM, screenshots or browser automation.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  Box3,
  BufferGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';
import { buildScanningBay } from './bayGeometry';
import { defaultBayVisualSettings, normalizeBayVisualSettings } from './bayControls';

describe('manufactured tunnel geometry and controls', () => {
  it('keeps the crown open and the optical cameras clear of the sedan travel envelope', () => {
    const bay = buildScanningBay();
    try {
      const canopy = bay.root.getObjectByName('Open perimeter canopy');
      expect(canopy).toBeDefined();
      expect(canopy?.children.filter((child) => child.name === 'Satin canopy louver')).toHaveLength(
        0,
      );
      expect(
        canopy?.children.filter((child) => child.name === 'Canopy longitudinal edge panel'),
      ).toHaveLength(2);
      const edgePanel = canopy?.getObjectByName('Canopy longitudinal edge panel') as Mesh;
      edgePanel.geometry.computeBoundingBox();
      expect(
        edgePanel.geometry.boundingBox!.max.x - edgePanel.geometry.boundingBox!.min.x,
      ).toBeLessThan(0.18);
      const crossmembers: Mesh[] = [];
      bay.root.traverse((object) => {
        if (object.name === 'Structural canopy crossmember') crossmembers.push(object as Mesh);
      });
      expect(crossmembers).toHaveLength(3);
      crossmembers.forEach(({ geometry }) => {
        geometry.computeBoundingBox();
        expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeLessThan(0.3);
      });
      expect(bay.root.getObjectByName('CABEK tunnel operator console')).toBeDefined();
      expect(bay.root.getObjectByName('Console label CABEK')).toBeDefined();
      expect(bay.root.getObjectByName('Console display mounting plate')).toBeDefined();
      expect(bay.root.getObjectByName('Console adjustable tilt hinge')).toBeDefined();
      const housings: InstancedMesh[] = [];
      bay.root.traverse((object) => {
        if (object instanceof InstancedMesh && object.name === 'Machined optical camera housings')
          housings.push(object);
      });
      expect(housings).toHaveLength(2);
      expect(housings.reduce((count, mesh) => count + mesh.count, 0)).toBe(20);
      const sideSensors = bay.root.getObjectByName('Side optical camera array')!;
      bay.root.updateMatrixWorld(true);
      const portalBounds: Box3[] = [];
      bay.root.traverse((object) => {
        if (object.name === 'Portal structural upright')
          portalBounds.push(new Box3().setFromObject(object));
      });
      for (const mesh of sideSensors.children) {
        const sensor = mesh as InstancedMesh;
        const bounds = new Box3().setFromObject(sensor);
        expect(bounds.min.y).toBeGreaterThan(0.75);
        expect(bounds.max.y).toBeLessThan(2.1);
        //
        // The mirrored array spans the lane; each individual camera must remain outside it.
        //
        for (let index = 0; index < sensor.count; index += 1) {
          const transform = new Matrix4();
          sensor.getMatrixAt(index, transform);
          sensor.geometry.computeBoundingBox();
          const instanceBounds = sensor.geometry.boundingBox!.clone().applyMatrix4(transform);
          expect(instanceBounds.max.x < -1.5 || instanceBounds.min.x > 1.5).toBe(true);
          expect(portalBounds.some((portal) => portal.intersectsBox(instanceBounds))).toBe(false);
        }
      }
      const overheadBounds = new Box3().setFromObject(
        bay.root.getObjectByName('Overhead optical camera array')!,
      );
      expect(overheadBounds.min.y).toBeGreaterThan(2.4);
    } finally {
      bay.dispose();
    }
  });

  it('keeps the physical screen synchronized and removes canopy-mounted sensors with the roof', () => {
    const bay = buildScanningBay();
    try {
      const canopy = bay.root.getObjectByName('Open perimeter canopy')!;
      const sensors = bay.root.getObjectByName('Side optical camera array')!;
      const overheadSensors = bay.root.getObjectByName('Overhead optical camera array')!;
      expect(overheadSensors.parent).toBe(canopy);
      bay.applySettings({ illumination: 0.2, sensorsVisible: false, canopyVisible: false });
      expect(canopy.visible).toBe(false);
      expect(sensors.visible).toBe(false);
      expect(overheadSensors.visible).toBe(false);
      expect(bay.root.getObjectByName('Console brightness indicator')?.scale.x).toBe(0.2);
      expect(bay.root.getObjectByName('Sensor display switch')?.position.x).toBe(0.248);
      expect(bay.root.getObjectByName('Canopy display switch')?.position.x).toBe(0.248);
      expect(bay.lights[0].intensity).toBeCloseTo(0.64);
      bay.applySettings(defaultBayVisualSettings);
      expect(canopy.visible).toBe(true);
      expect(overheadSensors.visible).toBe(true);
      expect(bay.root.getObjectByName('Canopy display switch')?.position.x).toBe(0.32);
    } finally {
      bay.dispose();
    }
  });

  it('gives each portal its own recessed diffuser material and physical light pair', () => {
    const bay = buildScanningBay();
    try {
      const portalMaterials = new Map<number, MeshStandardMaterial>();
      bay.root.traverse((object) => {
        if (!(object instanceof Mesh) || object.name !== 'Vertical scan diffuser') return;
        const material = object.material as MeshStandardMaterial;
        const existing = portalMaterials.get(object.position.z);
        if (existing) expect(existing).toBe(material);
        portalMaterials.set(object.position.z, material);
        expect(material.toneMapped).toBe(true);
      });
      expect(new Set(portalMaterials.values()).size).toBe(3);
      for (const depth of portalMaterials.keys()) {
        expect(bay.lights.filter((light) => light.position.z === depth)).toHaveLength(2);
      }
    } finally {
      bay.dispose();
    }
  });

  it('keeps the floor matte and differentiates brushed alloy from optical sensor coatings', () => {
    const bay = buildScanningBay();
    try {
      const floor = bay.root.getObjectByName('Studio floor') as Mesh;
      const floorMaterial = floor.material as MeshStandardMaterial;
      expect(floorMaterial.metalness).toBe(0);
      expect(floorMaterial.roughness).toBeGreaterThan(0.9);
      const shell = bay.root.getObjectByName('Canopy longitudinal edge panel') as Mesh;
      expect(shell.material).toBeInstanceOf(MeshPhysicalMaterial);
      expect((shell.material as MeshPhysicalMaterial).anisotropy).toBeGreaterThan(0);
      const windows = bay.root.getObjectByName('Coated camera lenses') as Mesh;
      const optics = bay.root.getObjectByName('Camera iris apertures') as Mesh;
      expect(optics).toBeDefined();
      expect(optics.material).not.toBe(windows.material);
      expect((windows.material as MeshPhysicalMaterial).envMapIntensity).toBeLessThanOrEqual(1);
    } finally {
      bay.dispose();
    }
  });

  it('disposes shared geometry, materials, console resources and instance buffers exactly once', () => {
    const bay = buildScanningBay();
    const geometry = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const instances: Mesh[] = [];
    bay.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometry.add(object.geometry);
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => materials.add(material));
      if ('isInstancedMesh' in object) instances.push(object);
    });
    const disposals = [...geometry, ...materials, ...instances].map((resource) =>
      vi.spyOn(resource as { dispose: () => void }, 'dispose'),
    );
    expect(disposals.length).toBeGreaterThan(30);
    bay.dispose();
    bay.dispose();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledOnce());
    expect(bay.root.children).toHaveLength(0);
  });

  it.each([
    [-1, 0.15],
    [0.45, 0.45],
    [5, 1],
    [Number.NaN, 0.75],
  ])('bounds illumination %s to %s before it reaches physical lighting', (requested, expected) => {
    const result = normalizeBayVisualSettings({
      ...defaultBayVisualSettings,
      illumination: requested,
    });
    expect(result.illumination).toBe(expected);
  });
});
