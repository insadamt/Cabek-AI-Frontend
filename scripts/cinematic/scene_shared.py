"""Create CABEK's fixed-camera photographic category scenes.

These helpers give every pre-rendered category the same petrol paint, white
studio, and controlled reflections. They depend on Blender 5, mathutils, and
the attributed vehicle/scanner GLBs in public/models. No runtime 3D is needed.
"""

from math import pi, radians
from pathlib import Path

import bpy
from mathutils import Vector


# ============================================================
# Consistent materials and manufactured geometry
# ============================================================

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/cinematic"


def linear(hex_value):
    values = [int(hex_value[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return tuple(value / 12.92 if value <= 0.04045 else
                 ((value + 0.055) / 1.055) ** 2.4 for value in values)


def material(name, color, metallic=0, roughness=0.35, coat=0, emission=0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*linear(color), 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.055
    if emission:
        shader.inputs["Emission Color"].default_value = (*linear(color), 1)
        shader.inputs["Emission Strength"].default_value = emission
    return result


def replace_material(obj, replacement):
    obj.data.materials.clear()
    obj.data.materials.append(replacement)


def box(name, location, dimensions, surface, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    result = bpy.context.object
    result.name = name
    result.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    result.data.materials.append(surface)
    if bevel:
        edge = result.modifiers.new("Soft manufactured edges", "BEVEL")
        edge.width = bevel
        edge.segments = 3
        result.modifiers.new("Weighted studio normals", "WEIGHTED_NORMAL")
    return result


def aim_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def load_glb(filename, parent_name):
    old_objects = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / "public/models" / filename))
    imported = [obj for obj in bpy.data.objects if obj not in old_objects]
    root = bpy.data.objects.new(parent_name, None)
    bpy.context.collection.objects.link(root)
    for obj in imported:
        if obj.parent is None:
            obj.parent = root
    return root, imported


# ============================================================
# Vehicle and scan tunnel finishes
# ============================================================


def load_vehicle(position=(0, -3.6, 0), rotation=0):
    root, objects = load_glb("ferrari.glb", "Petrol vehicle")
    root.location = position
    root.rotation_euler.z = rotation
    paint = material("Deep petrol metallic", "087568", 0.62, 0.22, 0.8)
    alloy = material("Diamond cut wheel alloy", "dce2e1", 0.88, 0.19)
    glass = material("Dark blue optical glass", "112b36", 0.32, 0.1, 0.8)
    rubber = material("Deep satin tyre rubber", "151c1f", 0, 0.52)
    for obj in objects:
        if obj.type != "MESH":
            continue
        if obj.name.split(".")[0] == "body":
            replace_material(obj, paint)
        elif obj.name.startswith("rim_") or obj.name.split(".")[0] == "trim":
            replace_material(obj, alloy)
        elif obj.name.split(".")[0] == "glass":
            replace_material(obj, glass)
        elif obj.name.startswith("tire_"):
            replace_material(obj, rubber)
    return root, objects


def load_tunnel():
    root, objects = load_glb("cabek-scanner.glb", "CABEK graphite scanner")
    graphite = material("Deep graphite scanner", "0d151a", 0.25, 0.3, 0.2)
    satin = material("Petrol graphite satin", "263a40", 0.6, 0.28)
    aluminium = material("Cool brushed aluminium", "9aafb0", 0.8, 0.29)
    lime = material("Lime active light", "bcff43", 0.05, 0.25, emission=4)
    white = material("White scanner strip", "e9ffff", 0, 0.2, emission=4)
    for obj in objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            previous = slot.material.name if slot.material else ""
            if "Graphite" in previous:
                slot.material = graphite
            elif "Titanium" in previous:
                slot.material = satin
            elif "Aluminium" in previous:
                slot.material = aluminium
            elif "Lime" in previous:
                slot.material = lime
            elif "Light_White" in previous:
                slot.material = white
    #
    # Solid far-side equipment panels give the illuminated ribs a dark backdrop.
    #
    for index, depth in enumerate((-2, 0, 2)):
        panel = box(f"Graphite far wall panel {index}", (1.98, depth, 1.68),
                    (0.12, 1.94, 2.85), graphite, 0.035)
        panel.parent = root
    roof = box("Graphite floating scanner canopy", (0, 0, 3.4),
               (4.15, 6.4, 0.18), graphite, 0.045)
    roof.parent = root
    roof_surface = material("Dark satin scanner canopy", "0d151a", 0.08, 0.62)
    replace_material(roof, roof_surface)
    panel = box("Near-side rear equipment shell", (-1.98, 1.3, 1.7),
                (0.14, 2.5, 2.77), graphite, 0.04)
    panel.parent = root
    skirt = box("Near-side lower equipment shell", (-1.98, 0, 0.45),
                (0.14, 6.1, 0.64), graphite, 0.04)
    skirt.parent = root
    root.scale = (0.94, 0.8, 0.83)
    return root


# ============================================================
# Large softboxes shape the paint; studio remains seamless white
# ============================================================


def area(name, position, target, power, size, color=(1, 1, 1), shape="DISK"):
    source = bpy.data.lights.new(name, "AREA")
    source.energy = power
    source.shape = shape
    source.size = size
    source.color = color
    result = bpy.data.objects.new(name, source)
    bpy.context.collection.objects.link(result)
    result.location = position
    aim_at(result, target)
    return result


def build_studio():
    floor = material("Warm porcelain studio", "f4f6f3", 0, 0.72)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.02))
    bpy.context.object.name = "Seamless white photographic floor"
    bpy.context.object.data.materials.append(floor)
    bpy.context.object.is_shadow_catcher = True
    world = bpy.data.worlds.new("Neutral white studio environment")
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.9, 0.94, 1, 1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.65
    bpy.context.scene.world = world
    area("Long key softbox", (-4, -4, 8), (0, -2, 0.8), 2000, 7)
    area("Cool sculpting rim", (5, 1, 6), (0, -2, 0.8), 1800, 5, (0.73, 0.91, 1))
    area("Front reflective strip", (-4, -8, 4.5), (0, -2, 0.8), 1000, 5)
    area("Lime tunnel wash", (0, 0.5, 1.8), (0, -2, 0.2), 80, 1, (0.61, 1, 0.19))


def configure_scene(engine="CYCLES", samples=12, width=1000, height=625):
    scene = bpy.context.scene
    scene.render.engine = engine
    if engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 3
        scene.cycles.diffuse_bounces = 1
        scene.cycles.glossy_bounces = 2
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.use_persistent_data = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.fps = 24
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.3
    camera = bpy.data.cameras.new("Fixed cinematic category camera")
    camera.type = "ORTHO"
    camera.ortho_scale = 12.2
    result = bpy.data.objects.new("Fixed cinematic category camera", camera)
    bpy.context.collection.objects.link(result)
    result.location = (-10, -15, 3.9)
    aim_at(result, (0, -2.4, 1.1))
    scene.camera = result
    OUTPUT.mkdir(parents=True, exist_ok=True)
    return scene, result


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
