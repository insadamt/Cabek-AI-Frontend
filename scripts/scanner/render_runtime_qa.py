"""Save the actual frontend bay and supplied sedan as an editable Blender studio.

Depends on export_runtime_qa.mjs, the studio-v2 vehicle GLB and Blender 5 glTF/Cycles.
Preserves authored PBR surfaces and packs textures. Three bounded 12-sample stills
verify desktop/portrait geometry and camera framing; they are not WebGL screenshots.
"""

import json
import os
from math import radians
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
REVIEW_INPUT_DIRECTORY = Path('/tmp/cabek-real-bay-qa')
STUDIO_DIRECTORY = PROJECT_ROOT / 'assets/blender/cabek-studio-v2'
VEHICLE_PATH = PROJECT_ROOT / 'public/models/studio-v2/cabek-vehicle.glb'


# ============================================================
# Import exact runtime geometry and retain authored PBR surfaces
# ============================================================

def gltf_position(position):
    x, y, z = position
    return Vector((x, -z, y))


def import_glb(path, collection_name):
    previous_objects = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = [obj for obj in bpy.data.objects if obj not in previous_objects]
    collection = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(collection)
    for obj in objects:
        for previous_collection in list(obj.users_collection):
            previous_collection.objects.unlink(obj)
        collection.objects.link(obj)
    return objects, collection


def load_grounded_vehicle():
    objects, collection = import_glb(VEHICLE_PATH, 'Supplied sedan | runtime PBR')
    root = bpy.data.objects.new('Runtime grounded vehicle', None)
    collection.objects.link(root)
    for obj in objects:
        if obj.parent is None:
            obj.parent = root

    # The containing root matches frontend centering without altering local wheel pivots.

    bpy.context.view_layer.update()
    bounds = [obj.matrix_world @ Vector(corner) for obj in objects
              if obj.type == 'MESH' for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in bounds) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in bounds) for index in range(3)))
    center = (minimum + maximum) / 2
    root.location = Vector((-center.x, -center.y, -minimum.z))
    root['source'] = 'User supplied model.blend; exported studio-v2 GLB, PBR retained'
    root['frontend_asset'] = '/models/studio-v2/cabek-vehicle.glb'
    return root, objects


# ============================================================
# Bounded offline approximation of the frontend studio lighting
# ============================================================

def aim_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def add_softbox(collection, name, position, target, energy, size, color):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = energy
    light.shape = 'DISK'
    light.size = size
    light.color = color
    obj = bpy.data.objects.new(name, light)
    collection.objects.link(obj)
    obj.location = gltf_position(position)
    aim_at(obj, gltf_position(target))


def configure_studio():
    world = bpy.data.worlds.new('Approximate runtime studio PMREM')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.95, 0.92, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
    bpy.context.scene.world = world
    lights = bpy.data.collections.new('Offline softboxes | editable lighting approximation')
    bpy.context.scene.collection.children.link(lights)
    add_softbox(lights, 'Key reflection', (-5, 11, 8), (0, 0, 2.5), 2200, 8, (1, 0.97, 0.92))
    add_softbox(lights, 'Cool rim reflection', (7, 6, -5), (0, 0.8, 0), 1500, 6, (0.87, 0.95, 1))
    add_softbox(lights, 'Long top reflection', (0, 9, 0), (0, 0, 0), 1200, 6, (1, 1, 1))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 5
    scene.cycles.glossy_bounces = 3
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene['review_scope'] = 'Actual runtime geometry/cameras; offline lighting approximates WebGL'


# ============================================================
# Desktop/portrait camera review and complete editable scene
# ============================================================

def create_endpoint_camera(pose, collection):
    camera = bpy.data.cameras.new(pose['name'])
    camera.type = 'PERSP'
    camera.sensor_fit = 'VERTICAL'
    camera.lens_unit = 'FOV'
    camera.angle_y = radians(pose['verticalFov'])
    camera.clip_end = 120
    obj = bpy.data.objects.new(pose['name'], camera)
    collection.objects.link(obj)
    obj.location = gltf_position(pose['camera'])
    aim_at(obj, gltf_position(pose['target']))
    obj['frontend_pose'] = json.dumps(pose)
    return obj


def apply_review_pose(pose, camera, vehicle, grounded_position):
    scene = bpy.context.scene
    vehicle.location = grounded_position + gltf_position((0, 0, pose['vehicleZ']))
    scene.camera = camera
    scene.render.resolution_x = pose['width']
    scene.render.resolution_y = pose['height']
    bpy.context.view_layer.update()


def framing_report(objects, camera):
    scene = bpy.context.scene
    points = [world_to_camera_view(scene, camera, obj.matrix_world @ Vector(corner))
              for obj in objects if obj.type == 'MESH' and obj.name != 'Studio floor'
              for corner in obj.bound_box]
    return {
        'horizontal': [min(point.x for point in points), max(point.x for point in points)],
        'vertical': [min(point.y for point in points), max(point.y for point in points)],
        'all_geometry_in_front': all(point.z > 0 for point in points),
        'within_frame': all(0 <= point.x <= 1 and 0 <= point.y <= 1 and point.z > 0
                            for point in points),
    }


def save_editable_studio(parked_pose, parked_camera, vehicle, grounded_position):
    apply_review_pose(parked_pose, parked_camera, vehicle, grounded_position)
    scene = bpy.context.scene
    scene.name = 'CABEK v2 | supplied sedan and complete sensor tunnel'
    scene['runtime_geometry'] = 'src/components/scanner/bayGeometry.ts'
    scene['reusable_tunnel'] = '/models/studio-v2/cabek-tunnel.glb'
    scene['control_panel'] = 'Mesh controls shown in frontend; use browser UI for live operation'
    bpy.ops.object.select_all(action='DESELECT')
    vehicle.select_set(True)
    bpy.context.view_layer.objects.active = vehicle
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(STUDIO_DIRECTORY / 'cabek-studio.blend'))


def main():
    STUDIO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bay_objects, _ = import_glb(REVIEW_INPUT_DIRECTORY / 'runtime-bay.glb', 'Actual runtime sensor tunnel')
    vehicle, vehicle_objects = load_grounded_vehicle()
    grounded_position = vehicle.location.copy()
    configure_studio()
    cameras = bpy.data.collections.new('Exact frontend camera endpoints')
    bpy.context.scene.collection.children.link(cameras)
    poses = json.loads((REVIEW_INPUT_DIRECTORY / 'runtime-poses.json').read_text())
    if len(poses) > 3:
        raise ValueError('Geometry review is bounded to three low-resolution stills.')
    reports = []
    parked_pose = None
    parked_camera = None
    for pose in poses:
        camera = create_endpoint_camera(pose, cameras)
        apply_review_pose(pose, camera, vehicle, grounded_position)
        report = {'name': pose['name'], 'equipment_and_vehicle': framing_report(bay_objects + vehicle_objects, camera)}
        reports.append(report)
        bpy.context.scene.render.filepath = str(STUDIO_DIRECTORY / f"{pose['name']}.png")
        print(f'RENDERING_RUNTIME_POSE: {json.dumps(report)}', flush=True)
        # Corrections can refresh the packed studio without repeating unrelated renders.

        render_pose = os.environ.get('CABEK_REVIEW_POSE', 'all')
        if render_pose in ('all', pose['name']):
            bpy.ops.render.render(write_still=True)
        if pose['name'] == 'desktop-parked':
            parked_pose, parked_camera = pose, camera
    if parked_pose is None:
        raise ValueError('A desktop-parked camera is required to save the editable studio.')
    save_editable_studio(parked_pose, parked_camera, vehicle, grounded_position)
    (STUDIO_DIRECTORY / 'framing-report.json').write_text(json.dumps(reports, indent=2) + '\n')
    print(f'EDITABLE_STUDIO_AND_BOUNDED_PREVIEWS: {STUDIO_DIRECTORY}', flush=True)


if __name__ == '__main__':
    main()
