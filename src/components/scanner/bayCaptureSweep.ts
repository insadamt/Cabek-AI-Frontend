/** Draw the moving green capture frame from runtime depth and opacity.
 * Three.js depth testing keeps its edge legible through the Blender tunnel's solid side panels.
 */
import {
  AdditiveBlending,
  DoubleSide,
  ExtrudeGeometry,
  GreaterDepth,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shape,
} from 'three';
import type { CapturePresentationFrame } from './bayCaptureLight';

export function createBayCaptureSweep() {
  const root = new Group();
  root.name = 'Photo capture sweep';
  root.visible = false;

  const outline = new Shape();
  outline.moveTo(-1.55, 0.045);
  outline.lineTo(-1.55, 2.42);
  outline.lineTo(1.55, 2.42);
  outline.lineTo(1.55, 0.045);
  outline.lineTo(1.505, 0.045);
  outline.lineTo(1.505, 2.375);
  outline.lineTo(-1.505, 2.375);
  outline.lineTo(-1.505, 0.045);
  outline.closePath();
  const rim = new ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: false });
  rim.translate(0, 0, -0.0175);
  const edge = new MeshBasicMaterial({
    color: '#9df568',
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  // Only the hidden portion gets a faint trace, so the operator can follow the pass behind steel.
  const hiddenEdge = edge.clone();
  hiddenEdge.depthFunc = GreaterDepth;
  const planeGeometry = new PlaneGeometry(3.05, 2.35);
  const fill = new MeshBasicMaterial({
    color: '#a6e97a',
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const plane = new Mesh(planeGeometry, fill);
  plane.position.y = 1.22;
  const trace = new Mesh(rim, hiddenEdge);
  const visibleEdge = new Mesh(rim, edge);
  trace.renderOrder = 1;
  visibleEdge.renderOrder = 2;
  root.add(plane, trace, visibleEdge);
  let disposed = false;
  return {
    root,
    update(frame: CapturePresentationFrame) {
      if (disposed) return;
      root.visible = frame.sweepOpacity > 0;
      root.position.z = frame.sweepDepth;
      plane.visible = !frame.reduced;
      fill.opacity = 0.09 * frame.sweepOpacity;
      edge.opacity = frame.sweepOpacity;
      hiddenEdge.opacity = 0.33 * frame.sweepOpacity;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      rim.dispose();
      planeGeometry.dispose();
      edge.dispose();
      hiddenEdge.dispose();
      fill.dispose();
    },
  };
}
