"""Render the real scanner and car together for visual review and WebGL fallback.

Run with ALSOFT_DRIVERS=null blender --background -setaudio None --threads 4
    --python scripts/scanner/render_preview.py
Depends on Blender's bpy/Cycles, its glTF importer, and both public/models GLBs.
The bounded CPU render uses the same car finish, placement, and camera as the
interactive prototype so the fallback remains an honest view of that scene.
"""

from math import radians
from pathlib import Path

import bpy
from mathutils import Vector


# ============================================================
# Shared scene coordinates and appearance
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIRECTORY = PROJECT_ROOT / "public/models"
OUTPUT_PATH = MODEL_DIRECTORY / "scanner-preview.webp"
CAMERA_GLTF = (-11.0, 6.0, 11.0)
TARGET_GLTF = (0.0, 1.1, 1.7)
CAR_GLTF = (0.0, 0.1, 5.4)


def gltf_to_blender(position):
    x, y, z = position
    return Vector((x, -z, y))


def linear_color(hex_value):
    channels = [int(hex_value[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return tuple(
        value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
        for value in channels
    )


def create_material(name, color, metallic=0.0, roughness=0.4, coat=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*linear_color(color), 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.07
    return material


# ============================================================
# Load portable scene assets
# ============================================================


def import_asset(filename):
    previous_objects = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODEL_DIRECTORY / filename))
    return [obj for obj in bpy.data.objects if obj not in previous_objects]


def replace_material(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def import_car():
    car_objects = import_asset("ferrari.glb")
    car_root = bpy.data.objects.new("PreviewCarPlacement", None)
    bpy.context.collection.objects.link(car_root)
    for obj in car_objects:
        if obj.parent is None:
            obj.parent = car_root
    car_root.location = gltf_to_blender(CAR_GLTF)
    paint = create_material("Preview_Graphite_Paint", "565e62", 0.8, 0.22, 1.0)
    alloy = create_material("Preview_Satin_Alloy", "b9bfc1", 0.88, 0.24)
    glass = create_material("Preview_Smoked_Glass", "242d32", 0.3, 0.12, 0.6)
    glass.node_tree.nodes.get("Principled BSDF").inputs["Transmission Weight"].default_value = 0.1
    for obj in car_objects:
        if obj.type != "MESH":
            continue
        if obj.name == "body":
            replace_material(obj, paint)
        elif obj.name.startswith("rim_") or obj.name == "trim":
            replace_material(obj, alloy)
        elif obj.name == "glass":
            replace_material(obj, glass)
    bpy.context.view_layer.update()
    bounds = [obj.matrix_world @ Vector(corner) for obj in car_objects
              if obj.type == "MESH" for corner in obj.bound_box]
    minimum = tuple(min(point[index] for point in bounds) for index in range(3))
    maximum = tuple(max(point[index] for point in bounds) for index in range(3))
    print(f"CAR_BOUNDS_BLENDER: {minimum} -> {maximum}")


# ============================================================
# White studio, contact shadows, and reflected lightboxes
# ============================================================


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_area_light(name, position, target, power, size, color=(1.0, 1.0, 1.0)):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = power
    light.shape = "DISK"
    light.size = size
    light.color = color
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = gltf_to_blender(position)
    aim_at(obj, gltf_to_blender(target))


def build_studio():
    ground = create_material("Preview_Porcelain_Floor", "f6f7f5", 0.03, 0.48)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.008))
    bpy.context.object.name = "Seamless studio ground"
    bpy.context.object.data.materials.append(ground)
    world = bpy.data.worlds.new("Soft white photographic studio")
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.88, 0.92, 0.97, 1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.55
    bpy.context.scene.world = world

    #
    # Broad emitters describe the paint curves without introducing a dark showroom.
    #
    add_area_light("Key softbox", (-5, 8, 5), (0, 0.8, 2.4), 1700, 7)
    add_area_light("Long rim softbox", (5, 6, 1), (0, 1, 2), 1300, 5, (0.88, 0.94, 1.0))
    add_area_light("Entrance fill", (0, 4.5, 9), (0, 1, 3), 650, 4)
    add_area_light("Roof bounce", (0, 7, -3), (0, 0, 0), 900, 5)


def configure_render():
    scene = bpy.context.scene
    print("CONFIGURING_CYCLES", flush=True)
    scene.render.engine = "CYCLES"
    print("CYCLES_ENABLED", flush=True)
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.quality = 88
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.3
    scene.render.filepath = str(OUTPUT_PATH)
    camera = bpy.data.cameras.new("PreviewCamera")
    camera.type = "PERSP"
    camera.sensor_fit = "VERTICAL"
    camera.lens_unit = "FOV"
    camera.angle_y = radians(35)
    obj = bpy.data.objects.new("PreviewCamera", camera)
    bpy.context.collection.objects.link(obj)
    obj.location = gltf_to_blender(CAMERA_GLTF)
    aim_at(obj, gltf_to_blender(TARGET_GLTF))
    scene.camera = obj


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    import_asset("cabek-scanner.glb")
    import_car()
    print("ASSETS_READY", flush=True)
    build_studio()
    print("STUDIO_READY", flush=True)
    configure_render()
    print(f"CAMERA_GLTF: {CAMERA_GLTF}; TARGET_GLTF: {TARGET_GLTF}; CAR_GLTF: {CAR_GLTF}", flush=True)
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED_PREVIEW: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
