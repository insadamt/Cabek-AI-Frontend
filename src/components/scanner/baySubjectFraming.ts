/**
 * Fits the tunnel and approaching sedan prominently inside the actual canvas aspect ratio.
 * Depends on metre-scaled bay bounds and Three.js camera math; changing projection never scales physical geometry.
 */
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

const outward = new Vector3();
const right = new Vector3();
const up = new Vector3();
const relative = new Vector3();

export function fitBayCameraToSubject(
  camera: PerspectiveCamera,
  target: Vector3,
  entryProgress: number,
  aspect: number,
) {
  outward.copy(camera.position).sub(target).normalize();
  right.crossVectors(camera.up, outward).normalize();
  up.crossVectors(outward, right).normalize();
  const halfHeight = Math.tan(MathUtils.degToRad(camera.fov / 2));
  const halfWidth = halfHeight * aspect;
  const carDepth = 7.2 * (1 - entryProgress);
  const subjectPoints: [number, number, number][] = [];

  function includeBounds(min: number[], max: number[]) {
    for (const x of [min[0], max[0]]) {
      for (const y of [min[1], max[1]]) {
        for (const z of [min[2], max[2]]) {
          relative.set(x, y, z).sub(target);
          const depth = relative.dot(outward);
          subjectPoints.push([relative.dot(right), relative.dot(up), depth]);
        }
      }
    }
  }

  // Include the side rack and complete approach car so neither gets cropped by the closer framing.
  includeBounds([-2.09, 0, -3.22], [2.09, 2.86, 3.22]);
  includeBounds([2.06, 0.14, -3.2], [2.55, 2.31, -1.85]);
  includeBounds([-1.1, 0, carDepth - 2.4], [1.1, 1.7, carDepth + 2.4]);
  function minimumDistanceForAxis(axis: 0 | 1, halfSpan: number) {
    let upper = -Infinity;
    let lower = Infinity;
    for (const point of subjectPoints) {
      upper = Math.max(upper, point[axis] + point[2] * halfSpan);
      lower = Math.min(lower, point[axis] - point[2] * halfSpan);
    }
    return (upper - lower) / (2 * halfSpan);
  }
  const distance = Math.max(
    minimumDistanceForAxis(0, halfWidth * 0.92),
    minimumDistanceForAxis(1, halfHeight * 0.88),
    ...subjectPoints.map((point) => point[2] + camera.near),
  );
  // Balance the visible bounds in perspective; a world-space midpoint leaves the near tunnel off-center.
  function centerProjectedAxis(axis: 0 | 1) {
    let low = Math.min(...subjectPoints.map((point) => point[axis]));
    let high = Math.max(...subjectPoints.map((point) => point[axis]));
    for (let step = 0; step < 28; step++) {
      const offset = (low + high) / 2;
      let minimum = Infinity;
      let maximum = -Infinity;
      for (const point of subjectPoints) {
        const projected = (point[axis] - offset) / (distance - point[2]);
        minimum = Math.min(minimum, projected);
        maximum = Math.max(maximum, projected);
      }
      if (minimum + maximum > 0) low = offset;
      else high = offset;
    }
    return (low + high) / 2;
  }
  target.addScaledVector(right, centerProjectedAxis(0));
  target.addScaledVector(up, centerProjectedAxis(1));
  camera.position.copy(target).addScaledVector(outward, distance);
}
