/** Visible capture-only light plane; depends on Three.js meshes and runtime-owned elapsed time, without postprocessing. */
import {
  AdditiveBlending,
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';

export interface BayCaptureFrame {
  capturing: boolean;
  elapsedSeconds: number;
  reducedMotion: boolean;
}

export function createBayCaptureSweep() {
  const root = new Group();
  root.name = 'Photo capture sweep';
  root.visible = false;
  const barGeometry = new BoxGeometry(1, 1, 1);
  const planeGeometry = new PlaneGeometry(3.05, 2.35);
  const lightMaterial = new MeshBasicMaterial({ color: '#a6e97a', toneMapped: false });
  const planeMaterial = new MeshBasicMaterial({
    color: '#a6e97a',
    transparent: true,
    opacity: 0.075,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const plane = new Mesh(planeGeometry, planeMaterial);
  plane.position.y = 1.22;
  root.add(plane);
  for (const side of [-1, 1]) {
    const bar = new Mesh(barGeometry, lightMaterial);
    bar.scale.set(0.035, 2.35, 0.035);
    bar.position.set(side * 1.525, 1.22, 0);
    root.add(bar);
  }
  const top = new Mesh(barGeometry, lightMaterial);
  top.scale.set(3.05, 0.035, 0.035);
  top.position.y = 2.395;
  root.add(top);
  let disposed = false;
  return {
    root,
    update(frame: BayCaptureFrame) {
      if (disposed) return 0;
      root.visible = frame.capturing;
      if (!frame.capturing) return 0;

      // A cosine turnaround avoids abrupt jumps; reduced motion keeps a fixed illuminated frame.

      const depth = frame.reducedMotion
        ? 0
        : Math.cos((frame.elapsedSeconds * Math.PI) / 1.8) * 2.5;
      root.position.z = depth;
      plane.visible = !frame.reducedMotion;
      return depth;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      barGeometry.dispose();
      planeGeometry.dispose();
      lightMaterial.dispose();
      planeMaterial.dispose();
    },
  };
}
