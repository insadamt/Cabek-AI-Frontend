"""Export the supplied sedan as a compact, self-contained frontend vehicle.

Straightens the source steering pose and preserves evaluated geometry, smooth normals and packed PBR maps while replacing
the unsupported procedural paint with pearl clearcoat. Creates four rolling
pivots in metres. Depends on Blender 5, geometry.py and the user's model.blend;
the source file is read only and the output is confined to this project.
"""

from collections import defaultdict
from pathlib import Path
import json
import math

import bpy
from mathutils import Matrix, Vector

from export_assets import evaluated_mesh_copy, merge_parts
from geometry import empty, linear_color, material


PROJECT = Path(__file__).resolve().parents[2]
SOURCE = Path('/home/insayd/Desktop/3D/model.blend')
OUTPUT = PROJECT / 'public/models/studio-v2'
WHEEL_SOURCES = {
    'wheel_fl': ('generic-tire-low_121', 'generic-wheel_122'),
    'wheel_fr': ('generic-tire-low.001_125', 'generic-wheel.001_126'),
    'wheel_rl': ('generic-tire-low.002_129', 'generic-wheel.002_130'),
    'wheel_rr': ('generic-tire-low.003_133', 'generic-wheel.003_134'),
}


# ============================================================
# Read source geometry and prepare portable studio surfaces
# ============================================================

def read_source_scene():
    with bpy.data.libraries.load(str(SOURCE), link=False) as (available, requested):
        requested.scenes = available.scenes[:1]
    scene = requested.scenes[0]
    scene.name = 'CABEK sedan source for export'
    bpy.context.window.scene = scene
    bpy.context.view_layer.update()
    return scene


def object_bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects
               for corner in obj.bound_box]
    minimum = Vector([min(point[index] for point in corners) for index in range(3)])
    maximum = Vector([max(point[index] for point in corners) for index in range(3)])
    return minimum, maximum


def prepare_materials(meshes):
    paint = material('CABEK pearl paint', 'e1e5e1', .32, .23, coat=1)
    source_materials = {slot.material for obj in meshes for slot in obj.material_slots
                        if slot.material}
    for source in source_materials:
        if not source.use_nodes:
            continue
        shader = next((node for node in source.node_tree.nodes
                       if node.type == 'BSDF_PRINCIPLED'), None)
        if not shader:
            continue
        if source.name.startswith('Car_Paint'):
            # The source's custom paint node group cannot be represented by glTF.
            # Keep its normal texture while giving the exported paint a portable shader.

            for socket in ('Base Color', 'Metallic', 'Roughness', 'Coat Weight'):
                for link in list(shader.inputs[socket].links):
                    source.node_tree.links.remove(link)
            for socket, value in [('Base Color', linear_color('e1e5e1')),
                                  ('Metallic', .32), ('Roughness', .23),
                                  ('Coat Weight', 1), ('Coat Roughness', .09)]:
                shader.inputs[socket].default_value = value
            source.name = paint.name
        elif source.name.startswith('Glass_ext'):
            shader.inputs['Base Color'].default_value = linear_color('64787d')
            shader.inputs['Alpha'].default_value = 1
            shader.inputs['Metallic'].default_value = .02
            shader.inputs['Roughness'].default_value = .08
            shader.inputs['Transmission Weight'].default_value = .65
            shader.inputs['IOR'].default_value = 1.46
            shader.inputs['Coat Weight'].default_value = 1
    if paint.users == 0:
        bpy.data.materials.remove(paint)


def resize_embedded_textures(meshes):
    images = {node.image for obj in meshes for slot in obj.material_slots
              if slot.material and slot.material.use_nodes
              for node in slot.material.node_tree.nodes
              if node.type == 'TEX_IMAGE' and node.image}
    for image in images:
        width, height = image.size
        largest_dimension = max(width, height)
        # The car occupies a fraction of the stage; 1K maps retain surface detail
        # without transferring the source's full authoring texture set on phones.

        if largest_dimension > 1024:
            ratio = 1024 / largest_dimension
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            image.pack()


# ============================================================
# Bake metre-scaled meshes and retain four local X wheel pivots
# ============================================================

def prepare_straight_wheel_transforms(source_scene):
    transforms = {}
    diagnostics = {}
    for name, source_names in WHEEL_SOURCES.items():
        tire = source_scene.objects[source_names[0]]
        center = tire.matrix_world.translation.copy()
        axle = tire.matrix_world.to_3x3().col[0].normalized()
        straight_axle = Vector((1, 0, 0))
        correction_rotation = axle.rotation_difference(straight_axle).to_matrix().to_4x4()
        correction = (Matrix.Translation(center) @ correction_rotation @
                      Matrix.Translation(-center))
        front_or_rear = 'front' if name.startswith('wheel_f') else 'rear'
        side = 'l' if name.endswith('l') else 'r'
        component_names = [*source_names,
                           f'brake-disc-{front_or_rear}-{side}',
                           f'brake-caliper-{front_or_rear}-{side}']
        for source in source_scene.objects:
            if not any(source.name == prefix or source.name.startswith(prefix + '_')
                       for prefix in component_names):
                continue
            for child in [source, *source.children_recursive]:
                if child.type == 'MESH':
                    transforms[child] = correction
        corrected_axle = correction_rotation.to_3x3() @ axle
        if corrected_axle.dot(straight_axle) < 1 - 1e-6:
            raise ValueError(f'{name} axle could not be straightened')
        diagnostics[name] = {
            'source_steering_degrees': math.degrees(math.atan2(axle.y, axle.x)),
            'export_axle': list(corrected_axle),
        }
    return transforms, diagnostics


def export_user_vehicle():
    source_scene = read_source_scene()
    meshes = [obj for obj in source_scene.objects if obj.type == 'MESH']
    minimum, maximum = object_bounds(meshes)
    scale = 4.8 / (maximum.y - minimum.y)
    center = (minimum + maximum) / 2
    offset = Vector((-center.x, -center.y, -minimum.z))
    # Source faces -Y; glTF's Y-up conversion then puts its nose on -Z.

    alignment = Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Scale(scale, 4) @ Matrix.Translation(offset)
    prepare_materials(meshes)
    resize_embedded_textures(meshes)
    # Steering belongs to the input pose, not the straight scan trajectory.
    # Correct brakes with the wheel but retain them in the non-rolling body batch.

    straight_wheel_transforms, wheel_alignment = prepare_straight_wheel_transforms(source_scene)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    groups = {}
    centers = {}
    wheel_radius = None
    for name, source_names in WHEEL_SOURCES.items():
        tire = next(obj for obj in source_scene.objects if obj.name == source_names[0])
        centers[name] = alignment @ tire.matrix_world.translation
        for source_name in source_names:
            source = next(obj for obj in source_scene.objects if obj.name == source_name)
            for child in source.children_recursive:
                if child.type == 'MESH':
                    groups[child] = name
        if wheel_radius is None:
            tire_meshes = [obj for obj in tire.children_recursive if obj.type == 'MESH']
            tire_minimum, tire_maximum = object_bounds(tire_meshes)
            wheel_radius = (tire_maximum.z - tire_minimum.z) * scale / 2

    scene = bpy.data.scenes.new('CABEK supplied sedan export')
    bpy.context.window.scene = scene
    root = empty('CABEK_Supplied_Sedan', scene.collection)
    root['wheel_radius_metres'] = wheel_radius
    root['source'] = 'User supplied model.blend; original author/license not provided'
    root['forward'] = 'negative glTF Z'
    root['units'] = 'metres'
    pivots = {}
    for name, center in centers.items():
        pivot = empty(name, scene.collection, root)
        pivot.location = center
        pivot['wheel_radius_metres'] = wheel_radius
        pivots[name] = pivot
    batches = defaultdict(list)
    for source in meshes:
        group = groups.get(source)
        parent = pivots.get(group, root)
        transform = alignment @ straight_wheel_transforms.get(source, Matrix.Identity(4)) @ source.matrix_world
        if group:
            transform = Matrix.Translation(-centers[group]) @ transform
        copied = evaluated_mesh_copy(source, transform, scene.collection, parent, depsgraph)
        batches[group].append(copied)
    for name, objects in batches.items():
        merge_parts(objects, f'{name} rolling assembly' if name else 'CABEK sedan body')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / 'cabek-vehicle.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', use_active_scene=True,
        export_animations=False, export_cameras=False, export_lights=False,
        export_yup=True, export_extras=True,
        export_image_format='JPEG', export_jpeg_quality=90,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    manifest = {
        'source': str(SOURCE), 'source_meshes': len(meshes),
        'source_polygons': sum(len(obj.data.polygons) for obj in meshes),
        'length_metres': 4.8, 'wheel_radius_metres': wheel_radius,
        'wheel_pivots': list(WHEEL_SOURCES), 'front': 'negative glTF Z',
        'wheel_alignment': wheel_alignment,
        'license': 'User supplied; original author/license not provided',
        'changes': 'Straightened wheel/brake axles, metre scaling, pearl paint, portable glazing, merged geometry, wheel pivots, Draco compression',
        'file_bytes': path.stat().st_size,
    }
    (OUTPUT / 'vehicle-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest))
    return scene


if __name__ == '__main__':
    export_user_vehicle()
