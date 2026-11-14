/** Bind the authoritative Blender hierarchy to visibility and lighting controls.
 * Depends on studio-v3 node names, light_group extras and shared glTF resource ownership.
 */
import { Color, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { loadBayModel } from './bayModelLoader';
import { createResourceOwner } from './bayModelResources';
import type { BayVisualSettings } from './bayControls';

export const tunnelModelUrl = '/models/studio-v3/cabek-tunnel.glb';

export function bindBayTunnel(root: Group) {
  const resources = createResourceOwner();
  resources.capture(root);
  const canopyMounts: Object3D[] = [];
  const emitters = new Map<string, Set<MeshStandardMaterial>>();

  function node(name: string) {
    const found = root.getObjectByName(name);
    if (!found) throw new Error(`Missing tunnel node: ${name}`);
    return found;
  }

  try {
    const cameras = node('CAMERAS');
    const roof = node('ROOF');
    root.traverse((object) => {
      if (object.userData.canopy_mount) canopyMounts.push(object);
      if (object instanceof Mesh) {
        object.castShadow = object.name !== 'Studio_slab';
        object.receiveShadow = true;
      }
      const group = object.userData.light_group;
      if (typeof group !== 'string') return;
      const materials = emitters.get(group) ?? new Set<MeshStandardMaterial>();
      object.traverse((part) => {
        if (!(part instanceof Mesh)) return;
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          if (material instanceof MeshStandardMaterial) materials.add(material);
        }
      });
      emitters.set(group, materials);
    });
    const white = emitters.get('inspection.white');
    const rgb = emitters.get('exterior.rgb');
    if (!white?.size || !rgb?.size || [...white].some((material) => rgb.has(material)))
      throw new Error('The tunnel requires independent white and RGB diffuser materials.');
    const authoredWhite = [...white].map(
      (material) => [material, material.emissiveIntensity] as const,
    );
    const tint = new Color();
    return {
      root,
      applySettings(settings: BayVisualSettings) {
        cameras.visible = settings.sensorsVisible;
        roof.visible = settings.canopyVisible;
        canopyMounts.forEach((mount) => (mount.visible = settings.canopyVisible));
        for (const [material, intensity] of authoredWhite)
          material.emissiveIntensity = intensity * settings.illumination;
      },
      setExteriorLight(color: string, brightness: number) {
        tint.set(color);
        for (const material of rgb) {
          material.emissive.copy(tint);
          material.emissiveIntensity = brightness;
          material.color.copy(tint).multiplyScalar(0.12 + 0.48 * brightness);
        }
      },
      dispose() {
        root.removeFromParent();
        root.clear();
        resources.dispose();
      },
    };
  } catch (error) {
    resources.dispose();
    throw error;
  }
}

export async function loadBayTunnel(signal: AbortSignal) {
  const gltf = await loadBayModel(tunnelModelUrl, signal);
  const tunnel = bindBayTunnel(gltf.scene);
  if (signal.aborted) {
    tunnel.dispose();
    signal.throwIfAborted();
  }
  return tunnel;
}
