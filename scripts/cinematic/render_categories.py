"""Render fixed-camera CABEK category posters and short selection films.

Run with Blender 5, for example:
  blender -b -setaudio None -t 4 --python scripts/cinematic/render_categories.py
      -- --category expertise --poster --samples 12
The shared scene module imports the licensed vehicle/tunnel GLBs. Films render
numbered PNGs for ffmpeg encoding so category UI never depends on WebGL.
"""

import argparse
from math import pi
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scene_shared import (OUTPUT, aim_at, box, build_studio, configure_scene,
                          load_tunnel, load_vehicle, material, reset_scene)


# ============================================================
# Photo cards carry composition without invented scan results
# ============================================================


def text_label(text, location, size, surface):
    curve = bpy.data.curves.new(text, "FONT")
    curve.body = text
    curve.align_x = "LEFT"
    curve.size = size
    curve.extrude = 0.001
    result = bpy.data.objects.new(text, curve)
    bpy.context.collection.objects.link(result)
    result.location = location
    result.data.materials.append(surface)
    return result


def create_photo_card(name, center, camera, label, accent, tilt=0):
    paper = material(f"{name} graphite photo mount", "12262b", 0.1, 0.4)
    ink = material(f"{name} porcelain caption", "f5fcfa", 0, 0.6)
    image_surface = material(f"{name} deep petrol photograph", "0b555c", 0.32, 0.23)
    photograph_path = OUTPUT / "vehicle-photograph.png"
    if photograph_path.exists():
        texture = image_surface.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(str(photograph_path), check_existing=True)
        shader = image_surface.node_tree.nodes.get("Principled BSDF")
        image_surface.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
        shader.inputs["Metallic"].default_value = 0
        shader.inputs["Roughness"].default_value = 0.6
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.location = center
    root.rotation_euler = (Vector(camera.location) - Vector(center)).to_track_quat("Z", "Y").to_euler()
    root.rotation_euler.rotate_axis("Z", tilt)
    frame = box(f"{name} bevelled white edge", (0, 0, 0), (1.68, 1.4, 0.055), paper, 0.06)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.12, 0.036))
    photo = bpy.context.object
    photo.name = f"{name} photograph"
    photo.scale = (1.5, 0.93, 1)
    photo.data.materials.append(image_surface)
    stripe = box(f"{name} selection strip", (-0.73, -0.54, 0.04), (0.035, 0.15, 0.012), accent, 0.01)
    label_object = text_label(label, (-0.62, -0.59, 0.049), 0.115, ink)
    for obj in (frame, photo, stripe, label_object):
        obj.parent = root
    return root


def create_estimate_sheet(center, camera, accent):
    paper = material("Estimate ivory paper", "ffffff", 0, 0.38)
    ink = material("Estimate graphite ink", "143037", 0, 0.8)
    root = bpy.data.objects.new("Blank estimate sheet", None)
    bpy.context.collection.objects.link(root)
    root.location = center
    root.rotation_euler = (Vector(camera.location) - Vector(center)).to_track_quat("Z", "Y").to_euler()
    root.rotation_euler.rotate_axis("Z", -0.11)
    sheet = box("Estimate paper body", (0, 0, 0), (1.56, 2.05, 0.045), paper, 0.06)
    sheet.parent = root
    label = text_label("CABEK AI", (-0.58, 0.7, 0.034), 0.15, ink)
    label.parent = root
    for index, width in enumerate((1.14, 0.76, 1.14, 0.94, 1.14)):
        line = box("Unfilled estimate line", (-0.57 + width / 2, 0.37 - index * 0.22, 0.034),
                   (width, 0.025, 0.006), ink, 0.008)
        line.parent = root
    marker = box("Estimate accent", (-0.53, -0.78, 0.034), (0.14, 0.14, 0.008), accent, 0.025)
    marker.parent = root
    return root


# ============================================================
# Three distinct resting compositions share one visual language
# ============================================================


def build_expertise(scene, camera):
    load_tunnel()
    vehicle, objects = load_vehicle((0, -6.2, 0.02))
    vehicle.location.y = -6.2
    vehicle.keyframe_insert("location", frame=1)
    vehicle.location.y = -4.5
    vehicle.keyframe_insert("location", frame=48)
    for obj in objects:
        if obj.name.startswith("wheel_") or obj.name.startswith("rim_"):
            obj.rotation_euler.x = 0
            obj.keyframe_insert("rotation_euler", frame=1)
            obj.rotation_euler.x = -8
            obj.keyframe_insert("rotation_euler", frame=48)
    return []


def build_quick(scene, camera):
    vehicle, _ = load_vehicle((0, -0.5, 0.02), rotation=pi)
    vehicle.scale = (1.25, 1.25, 1.25)
    camera.data.ortho_scale = 9.0
    camera.location = (-9, -12, 3.6)
    aim_at(camera, (0, -0.35, 1.15))
    lime = material("Quick estimate lime", "bcff43", 0.08, 0.26)
    cards = [
        create_photo_card("Front photograph", (-2.4, 0.5, 2.0), camera, "01 / AVANT", lime, 0.1),
        create_photo_card("Side photograph", (-2.5, 1.9, 2.7), camera, "02 / CÔTÉ", lime, -0.08),
        create_estimate_sheet((2.4, -0.7, 1.8), camera, lime),
    ]
    return cards


def build_verification(scene, camera):
    vehicle, _ = load_vehicle((0, -0.3, 0.02), rotation=pi)
    vehicle.scale = (1.25, 1.25, 1.25)
    camera.data.ortho_scale = 9.2
    camera.location = (-9, -12, 3.6)
    aim_at(camera, (0, 0, 1.15))
    slate = material("Before photograph slate", "7d9196", 0.08, 0.35)
    lime = material("After photograph lime", "bcff43", 0.08, 0.26)
    cards = [
        create_photo_card("Before photograph", (-2.7, 0.6, 2.2), camera, "AVANT", slate, 0.07),
        create_photo_card("After photograph", (2.2, 0.6, 2.2), camera, "APRÈS", lime, -0.07),
    ]
    return cards


def animate_card_entrance(cards):
    for index, obj in enumerate(cards):
        resting = obj.location.copy()
        obj.location.z = resting.z - 0.45
        obj.scale = (0.02, 0.02, 0.02)
        obj.keyframe_insert("location", frame=1 + index * 4)
        obj.keyframe_insert("scale", frame=1 + index * 4)
        obj.location = resting
        obj.scale = (1, 1, 1)
        obj.keyframe_insert("location", frame=30 + index * 4)
        obj.keyframe_insert("scale", frame=30 + index * 4)


def parse_options():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", choices=("expertise", "quick", "verification"), default="expertise")
    parser.add_argument("--poster", action="store_true")
    parser.add_argument("--poster-output", type=Path)
    parser.add_argument("--photograph", action="store_true")
    parser.add_argument("--samples", type=int, default=12)
    parser.add_argument("--engine", default="CYCLES")
    parser.add_argument("--width", type=int, default=1000)
    parser.add_argument("--height", type=int, default=625)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def main():
    options = parse_options()
    reset_scene()
    scene, camera = configure_scene(options.engine, options.samples, options.width, options.height)
    build_studio()
    builders = {"expertise": build_expertise, "quick": build_quick, "verification": build_verification}
    if options.photograph:
        load_vehicle((0, -0.5, 0.02), rotation=pi)
        camera.data.ortho_scale = 6.5
        camera.location = (-9, -12, 4.6)
        aim_at(camera, (0, -0.35, 0.7))
    else:
        animate_card_entrance(builders[options.category](scene, camera))
    scene.frame_start = 1
    scene.frame_end = 48
    if options.photograph:
        scene.render.filepath = str(OUTPUT / "vehicle-photograph.png")
        bpy.ops.render.render(write_still=True)
    elif options.poster:
        scene.frame_set(48)
        scene.render.filepath = str(options.poster_output or OUTPUT / f"{options.category}-poster.png")
        bpy.ops.render.render(write_still=True)
    else:
        frame_directory = Path("/tmp/cabek-cinematic") / options.category
        frame_directory.mkdir(parents=True, exist_ok=True)
        #
        # Static-camera motion interpolates well between 24 clean rendered poses.
        # Existing poses are reused when a bounded render is interrupted.
        #
        selected_frames = [*range(1, 46, 2), 48]
        for frame in selected_frames:
            destination = frame_directory / f"frame-{frame:04d}.png"
            if destination.exists():
                continue
            scene.frame_set(frame)
            scene.render.filepath = str(destination)
            bpy.ops.render.render(write_still=True)
    print(f"CINEMATIC_RENDER_COMPLETE: {options.category}", flush=True)


if __name__ == "__main__":
    main()
