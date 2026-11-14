/** Verify the imported material/visibility contract and exactly-once release on actual Three.js objects. */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { expect, it, vi } from 'vitest';
import { bindBayTunnel } from './bayTunnel';
import { defaultBayVisualSettings, normalizeBayVisualSettings } from './bayControls';

function fixture() {
  const root = new Group();
  const roof = new Group(),
    cameras = new Group();
  roof.name = 'ROOF';
  cameras.name = 'CAMERAS';
  const geometry = new BoxGeometry();
  const inspection = new MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 2.5 });
  const exterior = new MeshStandardMaterial({ emissive: '#ffffff' });
  const crown = new Mesh(geometry, inspection),
    side = new Mesh(geometry, inspection);
  side.userData.light_group = crown.userData.light_group = 'inspection.white';
  crown.userData.canopy_mount = true;
  const rgb = new Mesh(geometry, exterior);
  rgb.userData.light_group = 'exterior.rgb';
  root.add(roof, cameras, crown, side, rgb);
  return { root, roof, cameras, crown, side, rgb, geometry, inspection, exterior };
}

it('keeps white inspection, one RGB zone and visibility independently adjustable', () => {
  const f = fixture(),
    tunnel = bindBayTunnel(f.root);
  tunnel.setExteriorLight('#ff0000', 0.3);
  tunnel.applySettings({ illumination: 0.4, sensorsVisible: false, canopyVisible: false });
  expect(f.inspection.emissiveIntensity).toBe(1);
  expect(f.inspection.emissive.getHexString()).toBe('ffffff');
  expect(f.exterior.emissive.getHexString()).toBe('ff0000');
  expect(f.exterior.emissiveIntensity).toBe(0.3);
  expect([f.roof.visible, f.cameras.visible, f.crown.visible, f.side.visible]).toEqual([
    false,
    false,
    false,
    true,
  ]);
  tunnel.applySettings(defaultBayVisualSettings);
  expect(f.crown.visible && f.cameras.visible && f.roof.visible).toBe(true);
  const disposals = [f.geometry, f.exterior, f.inspection].map((r) => vi.spyOn(r, 'dispose'));
  tunnel.dispose();
  tunnel.dispose();
  disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledOnce());
});

it('rejects an export with aliased RGB and white materials and releases it', () => {
  const f = fixture();
  f.rgb.material = f.inspection;
  const dispose = vi.spyOn(f.inspection, 'dispose');
  expect(() => bindBayTunnel(f.root)).toThrow('independent');
  expect(dispose).toHaveBeenCalledOnce();
});

it.each([
  [-1, 0.15],
  [0.45, 0.45],
  [5, 1],
  [NaN, 0.75],
])('bounds inspection brightness %s', (value, expected) => {
  expect(
    normalizeBayVisualSettings({ ...defaultBayVisualSettings, illumination: value }).illumination,
  ).toBe(expected);
});
