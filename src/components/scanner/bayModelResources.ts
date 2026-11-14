/** Owns shared mesh, material and texture resources for decoded Three.js assets. */
import * as THREE from 'three';

export function createResourceOwner() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let disposed = false;

  function rememberMaterial(material: THREE.Material) {
    materials.add(material);
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
  }

  function capture(root: THREE.Object3D) {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach(rememberMaterial);
    });
  }

  return {
    capture,
    rememberMaterial,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      geometries.clear();
      materials.clear();
      textures.clear();
    },
  };
}
