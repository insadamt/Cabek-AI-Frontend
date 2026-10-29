/**
 * Verifies the open tunnel architecture, independent portal lighting and shared GPU resource ownership.
 * Depends on the real Three.js mesh builder without WebGL, DOM, screenshots or browser automation.
 */
import { describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { buildScanningBay } from './bayGeometry';
import { defaultBayVisualSettings, normalizeBayVisualSettings } from './bayControls';

describe('manufactured tunnel geometry and controls', () => {
  it('opens the overhead structure and uses flat sensor windows instead of projecting camera barrels', () => {
    const bay = buildScanningBay();
    try {
      const canopy = bay.root.getObjectByName('Complete louvered canopy');
      expect(canopy).toBeDefined();
      expect(canopy?.children.filter((child) => child.name === 'Satin canopy louver')).toHaveLength(
        6,
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
        expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeLessThan(0.13);
      });
      expect(bay.root.getObjectByName('CABEK tunnel operator console')).toBeDefined();
      expect(bay.root.getObjectByName('Console label CABEK')).toBeDefined();
      expect(bay.root.getObjectByName('Console display mounting plate')).toBeDefined();
      expect(bay.root.getObjectByName('Console adjustable tilt hinge')).toBeDefined();
      const windows: Mesh[] = [];
      bay.root.traverse((object) => {
        expect(object.name.toLowerCase()).not.toMatch(/camera|barrel|lens/);
        if (object.name === 'Twenty flat sensor windows') windows.push(object as Mesh);
      });
      expect(windows).toHaveLength(2);
      for (const window of windows) {
        window.geometry.computeBoundingBox();
        const box = window.geometry.boundingBox!;
        expect(box.max.y - box.min.y).toBeLessThan(0.005);
      }
    } finally {
      bay.dispose();
    }
  });

  it('keeps the physical screen synchronized and removes canopy-mounted sensors with the roof', () => {
    const bay = buildScanningBay();
    try {
      const canopy = bay.root.getObjectByName('Complete louvered canopy')!;
      const sensors = bay.root.getObjectByName('Integrated sensor windows')!;
      const overheadSensors = bay.root.getObjectByName('Canopy sensor windows')!;
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
      const windows = bay.root.getObjectByName('Twenty flat sensor windows') as Mesh;
      const optics = bay.root.getObjectByName('Twenty recessed optical apertures') as Mesh;
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
