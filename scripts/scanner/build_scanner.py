"""Build the CABEK scanner's reusable, bevelled PBR model for the category stage.

Run with Blender 5: blender --background --python scripts/scanner/build_scanner.py
Depends only on Blender's bundled Python/bpy and an installed sans-serif font.
The GLB uses metres, Y-up, floor Y=0, front Z=+3.25 and travel toward negative Z.
Geometry is consolidated by material and purpose to keep browser draw calls low.
"""

from collections import defaultdict
from math import pi
from pathlib import Path

import bpy
from mathutils import Vector


# ============================================================
# Materials and geometry helpers
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "public/models/cabek-scanner.glb"
GEOMETRY_GROUPS = defaultdict(list)


def create_material(name, color, metallic=0.0, roughness=0.4, emission=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1.0)
        shader.inputs["Emission Strength"].default_value = emission
    return material


def finish_geometry(obj, name, material, group, bevel=0.0):
    obj.name = name
    obj.data.materials.append(material)
    if bevel:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        modifier = obj.modifiers.new("Manufactured edge radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal_modifier = obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
        normal_modifier.keep_sharp = True
        normal_modifier.weight = 40
        bpy.ops.object.modifier_apply(modifier=normal_modifier.name)
    GEOMETRY_GROUPS[(group, material.name)].append(obj)
    return obj


def box(name, location, dimensions, material, group, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    return finish_geometry(obj, name, material, group, bevel)


def beam(name, start, end, thickness, depth, material, group, bevel=0.012):
    direction = Vector(end) - Vector(start)
    center = (Vector(start) + Vector(end)) / 2
    obj = box(name, center, (thickness, depth, direction.length), material, group, bevel)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def cylinder(name, location, radius, depth, material, group, direction=(0, 0, 1)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20, radius=radius, depth=depth, location=location
    )
    obj = bpy.context.object
    obj.rotation_euler = Vector(direction).to_track_quat("Z", "Y").to_euler()
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return finish_geometry(obj, name, material, group, bevel=0.003)


def wordmark(text, location, size, material, group="Branding", spacing=1.0):
    curve = bpy.data.curves.new(text, "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.space_character = spacing
    curve.extrude = 0.0007
    curve.bevel_depth = 0.0004
    curve.bevel_resolution = 1
    curve.resolution_u = 5
    font_path = Path("/usr/share/fonts/TTF/DejaVuSans.ttf")
    if font_path.exists():
        curve.font = bpy.data.fonts.load(str(font_path))
    obj = bpy.data.objects.new(text, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (pi / 2, 0, 0)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return finish_geometry(bpy.context.object, text, material, group)


# ============================================================
# Scanner architecture
# ============================================================


def build_platform(materials):
    box("Low profile floating scan deck", (0, 0, 0.042), (4.06, 6.5, 0.084),
        materials["deck"], "Platform", 0.035)
    box("Recessed central drive surface", (0, 0, 0.088), (3.46, 6.42, 0.016),
        materials["floor"], "Platform", 0.008)
    for side in (-1, 1):
        box("Brushed edge protection", (side * 1.98, 0, 0.115), (0.09, 6.38, 0.07),
            materials["aluminium"], "Platform", 0.018)
        box("Continuous inlaid guidance", (side * 0.93, 0, 0.099), (0.016, 6.1, 0.006),
            materials["lime"], "Light_Floor_Lime", 0.002)
        for depth in (-2.95, -2.2, -1.45, -0.7, 0.05, 0.8, 1.55, 2.3, 3.0):
            box("Deck drainage seam", (side * 1.49, depth, 0.1), (0.28, 0.012, 0.004),
                materials["seam"], "Platform", 0.001)
    for depth in (-3.2, 3.2):
        box("Threshold sill", (0, depth, 0.089), (3.5, 0.045, 0.03),
            materials["aluminium"], "Platform", 0.007)


def build_outer_frame(materials):
    for depth, frame_name in ((-2.98, "Entrance"), (2.98, "Exit")):
        for side in (-1, 1):
            box(f"{frame_name} structural column", (side * 1.91, depth, 1.58),
                (0.3, 0.36, 3.05), materials["graphite"], "Structure", 0.042)
            box(f"{frame_name} column face insert", (side * 1.913, depth - 0.184, 1.54),
                (0.19, 0.012, 2.72), materials["satin"], "Structure", 0.009)
            if depth < 0:
                box("Entrance vertical light inlay", (side * 1.913, depth - 0.195, 1.67),
                    (0.022, 0.009, 2.28), materials["lime"], "Light_Front_Lime", 0.004)
                for height in (0.28, 2.83):
                    cylinder("Flush frame fixing", (side * 1.91, depth - 0.201, height),
                             0.017, 0.007, materials["aluminium"], "Hardware", (0, -1, 0))
        box(f"{frame_name} upper lintel", (0, depth, 3.185), (4.12, 0.42, 0.48),
            materials["graphite"], "Structure", 0.045)
        box(f"{frame_name} lintel leading edge", (0, depth - 0.219, 2.957),
            (3.49, 0.02, 0.025), materials["aluminium"], "Hardware", 0.006)
    for side in (-1, 1):
        box("Continuous top side spine", (side * 1.9, 0, 3.16), (0.22, 5.78, 0.21),
            materials["graphite"], "Structure", 0.027)
        box("Low side equipment trunk", (side * 1.86, 0, 0.28), (0.19, 5.7, 0.33),
            materials["satin"], "Structure", 0.022)
        box("Inner equipment trunk cap", (side * 1.747, 0, 0.44), (0.045, 5.56, 0.035),
            materials["aluminium"], "Hardware", 0.009)


def build_light_ribs(materials):
    #
    # Open ribs keep the vehicle readable at the stage's three-quarter camera angle.
    #
    for index, depth in enumerate((-2.55, -1.7, -0.85, 0, 0.85, 1.7, 2.55)):
        for side in (-1, 1):
            beam(f"Rib {index} vertical", (side * 1.78, depth, 0.48),
                 (side * 1.78, depth, 2.58), 0.085, 0.075,
                 materials["aluminium"], "Interior_Ribs", 0.009)
            beam(f"Rib {index} shoulder", (side * 1.78, depth, 2.58),
                 (side * 1.44, depth, 2.93), 0.085, 0.075,
                 materials["aluminium"], "Interior_Ribs", 0.009)
            box(f"Rib {index} vertical diffuser housing", (side * 1.72, depth, 1.53),
                (0.038, 0.09, 1.92), materials["rubber"], "Interior_Ribs", 0.006)
            box(f"Rib {index} vertical light", (side * 1.695, depth, 1.53),
                (0.011, 0.044, 1.86), materials["white_light"], "Light_Interior_White", 0.004)
            beam(f"Rib {index} angled light", (side * 1.71, depth, 2.57),
                 (side * 1.40, depth, 2.88), 0.018, 0.043,
                 materials["white_light"], "Light_Interior_White", 0.004)
        box(f"Rib {index} ceiling bridge", (0, depth, 2.955), (2.9, 0.075, 0.08),
            materials["aluminium"], "Interior_Ribs", 0.01)
        box(f"Rib {index} ceiling diffuser", (0, depth, 2.905), (2.7, 0.046, 0.012),
            materials["white_light"], "Light_Interior_White", 0.004)


def build_camera_pods(materials):
    #
    # Twenty visible optical pods connect the object to CABEK's real scan equipment.
    #
    for depth in (-2.15, -0.72, 0.72, 2.15):
        for side in (-1, 1):
            for height in (0.95, 2.1):
                box("Side camera mounting bracket", (side * 1.795, depth, height),
                    (0.095, 0.21, 0.18), materials["graphite"], "Optics", 0.02)
                direction = (-side, 0, 0)
                cylinder("Camera barrel", (side * 1.72, depth, height), 0.068, 0.1,
                         materials["graphite"], "Optics", direction)
                cylinder("Optical metal surround", (side * 1.663, depth, height),
                         0.049, 0.014, materials["aluminium"], "Optics", direction)
                cylinder("Coated optical glass", (side * 1.653, depth, height),
                         0.037, 0.009, materials["lens"], "Optics", direction)
                cylinder("Camera ready indicator", (side * 1.654, depth + 0.072, height + 0.04),
                         0.006, 0.006, materials["lime"], "Light_Status_Lime", direction)
        box("Ceiling optical mount", (0, depth, 2.965), (0.21, 0.25, 0.13),
            materials["graphite"], "Optics", 0.02)
        cylinder("Ceiling optical barrel", (0, depth, 2.865), 0.067, 0.12,
                 materials["graphite"], "Optics", (0, 0, -1))
        cylinder("Ceiling lens", (0, depth, 2.799), 0.041, 0.012,
                 materials["lens"], "Optics", (0, 0, -1))


def build_fascia_and_terminal(materials):
    wordmark("CABEK AI", (0, -3.204, 3.23), 0.275, materials["branding"])
    wordmark("SCAN AUTOMOBILE INTELLIGENT", (0, -3.204, 3.035), 0.047,
             materials["branding"], spacing=1.15)
    box("Entrance status slot", (1.47, -3.204, 3.19), (0.14, 0.016, 0.021),
        materials["lime"], "Light_Front_Lime", 0.006)
    box("Compact control terminal", (2.085, -2.94, 1.69), (0.39, 0.39, 1.06),
        materials["graphite"], "Terminal", 0.04)
    box("Flush terminal screen", (2.085, -3.141, 1.83), (0.27, 0.014, 0.53),
        materials["screen"], "Terminal", 0.013)
    for height, width in ((2.0, 0.16), (1.95, 0.12), (1.9, 0.16)):
        box("Terminal display line", (2.06, -3.151, height), (width, 0.003, 0.008),
            materials["branding"], "Terminal", 0.002)
    box("Terminal ready glyph", (2.085, -3.152, 1.7), (0.14, 0.005, 0.026),
        materials["lime"], "Light_Status_Lime", 0.005)
    wordmark("20 CAMERAS", (2.085, -3.152, 1.34), 0.035, materials["branding"])


# ============================================================
# Consolidation and portable GLB export
# ============================================================


def consolidate_geometry():
    root = bpy.data.objects.new("CabekScanner", None)
    bpy.context.collection.objects.link(root)
    for (group, material_name), objects in GEOMETRY_GROUPS.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        merged = bpy.context.object
        merged.name = f"{group}_{material_name}"
        merged.data.name = merged.name
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        ensure_vehicle_clearance(merged)
        merged.parent = root
    root["travel_direction"] = "glTF negative Z; entrance at positive Z"
    root["clear_opening_metres"] = "3.40 width x 3.00 height above deck"
    return root


def ensure_vehicle_clearance(obj):
    #
    # Raise the optical bridge independently of floor hardware to leave 3m clearance.
    #
    for vertex in obj.data.vertices:
        vertex.co.x *= 1.032
        roof_weight = max(0.0, min(1.0, (vertex.co.z - 2.25) / 0.4))
        vertex.co.z += roof_weight * 0.3


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    materials = {
        "graphite": create_material("Graphite_Anodised", (0.027, 0.034, 0.041), 0.66, 0.29),
        "satin": create_material("Satin_Titanium", (0.09, 0.108, 0.12), 0.72, 0.34),
        "aluminium": create_material("Brushed_Aluminium", (0.47, 0.51, 0.53), 0.85, 0.3),
        "deck": create_material("Deck_Graphite", (0.11, 0.125, 0.132), 0.6, 0.36),
        "floor": create_material("Floor_Satin", (0.32, 0.35, 0.36), 0.72, 0.34),
        "seam": create_material("Drainage_Seam", (0.024, 0.03, 0.034), 0.2, 0.5),
        "rubber": create_material("Diffuser_Gasket", (0.016, 0.02, 0.022), 0.05, 0.58),
        "white_light": create_material("Light_White", (0.89, 0.96, 0.98), 0.0, 0.3, 2.2),
        "lime": create_material("Light_Lime", (0.51, 0.91, 0.06), 0.05, 0.3, 1.7),
        "branding": create_material("Wordmark_Porcelain", (0.91, 0.95, 0.95), 0.15, 0.38),
        "lens": create_material("Optical_Coating", (0.015, 0.046, 0.052), 0.8, 0.1),
        "screen": create_material("Terminal_Screen", (0.018, 0.031, 0.035), 0.25, 0.17),
    }
    build_platform(materials)
    build_outer_frame(materials)
    build_light_ribs(materials)
    build_camera_pods(materials)
    build_fascia_and_terminal(materials)
    root = consolidate_geometry()
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL_PATH), export_format="GLB", export_yup=True,
        export_apply=True, export_extras=True, export_cameras=False,
        export_lights=False, export_animations=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
    )
    mesh_count = sum(obj.type == "MESH" for obj in bpy.data.objects)
    vertex_count = sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == "MESH")
    print(f"Exported {MODEL_PATH}: {mesh_count} meshes, {vertex_count} vertices")
    print(f"Root: {root.name}; front +Z; vehicle travel -Z; ground Y=0")


if __name__ == "__main__":
    main()
