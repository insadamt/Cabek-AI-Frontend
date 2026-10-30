"""Light the reference-inspired scanner and save its editable Blender studio.

Depends on export_runtime_qa.mjs, the studio-v2 vehicle GLB and Blender 5 glTF/Cycles.
Rectangular automotive softboxes reveal brushed silver and graphite surfaces.
Preserves authored PBR surfaces and packs textures. Bounded 24-sample checks and
a 48-sample reference still review geometry; Blender lighting approximates browser shading.
"""

import json
import os
import sys
from math import radians
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from studio_surface_finish import apply_studio_surface_finishes


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


def assign_enum(owner, property_name, preferred_values):
    #
    # Render engines and colour-management identifiers vary across Blender installations.
    #
    for value in preferred_values:
        try:
            setattr(owner, property_name, value)
            return
        except (TypeError, ValueError):
            continue
    raise ValueError(f'No supported value for {property_name}: {preferred_values}')


def add_softbox(collection, name, position, target, energy, size, color):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = energy
    assign_enum(light, 'shape', ['RECTANGLE'])
    light.size, light.size_y = size
    light.color = color
    obj = bpy.data.objects.new(name, light)
    collection.objects.link(obj)
    obj.location = gltf_position(position)
    aim_at(obj, gltf_position(target))


def configure_studio():
    world = bpy.data.worlds.new('Approximate runtime studio PMREM')
    world.use_nodes = True
    background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (0.75, 0.78, 0.8, 1)
    background.inputs['Strength'].default_value = 0.22
    studio_hdri = Path(bpy.utils.system_resource('DATAFILES')) / 'studiolights/world/studio.exr'
    if studio_hdri.exists():
        environment = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
        environment.image = bpy.data.images.load(str(studio_hdri), check_existing=True)
        environment.image.pack()
        world.node_tree.links.new(environment.outputs['Color'], background.inputs['Color'])
        world['environment_provenance'] = 'Blender bundled studio HDRI; Greg Zaal / Poly Haven, CC0'
    bpy.context.scene.world = world
    lights = bpy.data.collections.new('Offline softboxes | editable lighting approximation')
    bpy.context.scene.collection.children.link(lights)
    #
    # Long sources create automotive highlight bands instead of isolated round hot spots.
    #
    add_softbox(lights, 'Broad overhead silk', (-2.2, 7, 0), (0, 0, 0), 700, (2.4, 7), (1, 0.98, 0.95))
    add_softbox(lights, 'Camera-side strip', (6, 4.8, -1), (0, 0.8, 0), 340, (6, 1), (1, 1, 1))
    add_softbox(lights, 'Far-side strip', (-5, 4, 0), (0, 1, 0), 650, (6, 1.2), (0.95, 0.98, 1))
    add_softbox(lights, 'Front fascia fill', (1, 4, -7), (0, 0.8, 0), 160, (4, 1.3), (1, 1, 1))
    add_softbox(lights, 'Rear separation strip', (-1, 5, 7), (0, 1, 0), 280, (4, 1), (1, 1, 1))
    scene = bpy.context.scene
    assign_enum(scene.render, 'engine', ['CYCLES'])
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 6
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    assign_enum(scene.view_settings, 'view_transform', ['AgX', 'Standard'])
    assign_enum(scene.view_settings, 'look', ['AgX - Medium High Contrast', 'Medium High Contrast', 'None'])
    scene.view_settings.exposure = 0
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
    obj['reference_pose' if pose['name'] == 'reference-study' else 'frontend_pose'] = json.dumps(pose)
    return obj


def create_reference_pose():
    return {
        'name': 'reference-study', 'progress': 1,
        'width': 1280, 'height': 854,
        'camera': [8.4, 6.7, -10.8], 'target': [0.2, 1, 0],
        'vehicleZ': 0, 'verticalFov': 28,
    }


def apply_review_pose(pose, camera, vehicle, grounded_position):
    scene = bpy.context.scene
    vehicle.location = grounded_position + gltf_position((0, 0, pose['vehicleZ']))
    scene.camera = camera
    scene.render.resolution_x = pose['width']
    scene.render.resolution_y = pose['height']
    scene.cycles.samples = 48 if pose['name'] == 'reference-study' else 24
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
    scene.name = 'CABEK v2 | reference optical scanner studio'
    scene['runtime_geometry'] = 'src/components/scanner/bayGeometry.ts'
    scene['reusable_tunnel'] = '/models/studio-v2/cabek-tunnel.glb'
    scene['control_panel'] = 'Mesh controls shown in frontend; use browser UI for live operation'
    bpy.ops.object.select_all(action='DESELECT')
    vehicle.select_set(True)
    bpy.context.view_layer.objects.active = vehicle
    bpy.ops.file.pack_all()
    #
    # Saving the project should not require a write to the user's desktop thumbnail cache.
    #
    preview_settings = bpy.context.preferences.filepaths
    preview_property = preview_settings.bl_rna.properties.get('file_preview_type')
    if preview_property and 'NONE' in preview_property.enum_items.keys():
        preview_settings.file_preview_type = 'NONE'
    bpy.ops.wm.save_as_mainfile(filepath=str(STUDIO_DIRECTORY / 'cabek-studio.blend'))


def main():
    STUDIO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bay_objects, _ = import_glb(REVIEW_INPUT_DIRECTORY / 'runtime-bay.glb', 'Actual runtime sensor tunnel')
    vehicle, vehicle_objects = load_grounded_vehicle()
    grounded_position = vehicle.location.copy()
    finished_materials = apply_studio_surface_finishes(bay_objects, vehicle_objects)
    print(f'MANUFACTURED_SURFACE_FINISHES: {json.dumps(finished_materials)}', flush=True)
    configure_studio()
    cameras = bpy.data.collections.new('Exact frontend camera endpoints')
    bpy.context.scene.collection.children.link(cameras)
    poses = json.loads((REVIEW_INPUT_DIRECTORY / 'runtime-poses.json').read_text())
    if len(poses) > 3:
        raise ValueError('Geometry review is bounded to three low-resolution stills.')
    reports = []
    parked_pose = None
    parked_camera = None
    render_pose = os.environ.get('CABEK_REVIEW_POSE', 'all')
    for pose in [*poses, create_reference_pose()]:
        camera = create_endpoint_camera(pose, cameras)
        apply_review_pose(pose, camera, vehicle, grounded_position)
        should_render = render_pose == pose['name'] or (render_pose == 'all' and pose['name'] != 'reference-study')
        report = {'name': pose['name'], 'rendered': should_render,
                  'equipment_and_vehicle': framing_report(bay_objects + vehicle_objects, camera)}
        reports.append(report)
        bpy.context.scene.render.filepath = str(STUDIO_DIRECTORY / f"{pose['name']}.png")
        print(f'RENDERING_RUNTIME_POSE: {json.dumps(report)}', flush=True)
        # Corrections can refresh the packed studio without repeating unrelated renders.

        if should_render:
            bpy.ops.render.render(write_still=True)
        if pose['name'] == 'desktop-parked' or (render_pose == 'reference-study' and should_render):
            parked_pose, parked_camera = pose, camera
    if parked_pose is None:
        raise ValueError('A desktop-parked camera is required to save the editable studio.')
    save_editable_studio(parked_pose, parked_camera, vehicle, grounded_position)
    (STUDIO_DIRECTORY / 'framing-report.json').write_text(json.dumps(reports, indent=2) + '\n')
    print(f'EDITABLE_STUDIO_AND_BOUNDED_PREVIEWS: {STUDIO_DIRECTORY}', flush=True)


if __name__ == '__main__':
    main()
