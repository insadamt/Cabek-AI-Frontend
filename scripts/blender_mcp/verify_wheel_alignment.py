"""Check the exported sedan's actual wheel geometry before and during rolling.

Uses principal axes rather than pivot names/metadata alone to catch steering
baked into vertices. Depends on Blender's glTF importer and bundled NumPy;
reads the frontend GLB and writes a small report beside the editable studio.
"""

from pathlib import Path
import json
import math

import bpy
import numpy as np


PROJECT = Path(__file__).resolve().parents[2]
WHEEL_NAMES = ('wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr')


# ============================================================
# Independent geometric checks on the compressed frontend asset
# ============================================================

def measure_axle_error(wheel):
    vertices = [child.matrix_world @ vertex.co
                for child in wheel.children_recursive if child.type == 'MESH'
                for vertex in child.data.vertices]
    if not vertices:
        raise AssertionError(f'{wheel.name} has no rolling geometry')
    _, axes = np.linalg.eigh(np.cov(np.asarray(vertices).T))
    axle = axes[:, 0]
    return math.degrees(math.acos(min(1, abs(float(axle[0])))))


def verify_wheel_alignment():
    bpy.ops.import_scene.gltf(filepath=str(PROJECT / 'public/models/studio-v2/cabek-vehicle.glb'))
    measurements = []
    for name in WHEEL_NAMES:
        wheel = bpy.context.scene.objects.get(name)
        if wheel is None:
            raise AssertionError(f'Missing rolling assembly: {name}')
        radius = wheel.get('wheel_radius_metres')
        if not isinstance(radius, (int, float)) or radius <= 0:
            raise AssertionError(f'Missing measured wheel radius: {name}')
        errors = []
        for travelled in (0, 3.6, 7.2):
            wheel.rotation_euler.x = -travelled / radius
            bpy.context.view_layer.update()
            error = measure_axle_error(wheel)
            if error >= .5:
                raise AssertionError(f'{name} deviates {error:.3f} degrees at {travelled} metres')
            errors.append({'travelled_metres': travelled, 'axle_error_degrees': error})
        measurements.append({'wheel': name, 'poses': errors})
    report = {'passed': True, 'maximum_axle_error_degrees': .5, 'measurements': measurements}
    destination = PROJECT / 'assets/blender/cabek-studio-v2/wheel-alignment-report.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    verify_wheel_alignment()
