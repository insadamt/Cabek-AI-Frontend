"""Shared modelling tools for the CABEK Blender asset study.

Keeps metre-scaled meshes, bevels and physically based materials consistent.
Depends on Blender's bpy/mathutils; executed in the connected Blender via MCP.
"""

import math
import bpy
from mathutils import Vector


# ============================================================
# Materials and scene ownership
# ============================================================

def linear_color(hex_value):
    values = [int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def material(name, color, metallic=0, roughness=.35, emission=0, coat=0):
    previous=bpy.data.materials.get(name)
    if previous and previous.users==0:
        bpy.data.materials.remove(previous)
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = next(n for n in result.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    rgba = linear_color(color)
    shader.inputs['Base Color'].default_value = rgba
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .1
    if emission:
        shader.inputs['Emission Color'].default_value = rgba
        shader.inputs['Emission Strength'].default_value = emission
    result.diffuse_color = rgba
    return result


def move_to_collection(obj, collection, parent=None):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = parent
    return obj


def empty(name, collection, parent=None):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = parent
    return obj


def mesh(name, vertices, faces, mat, collection, parent=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.parent = parent
    for face in data.polygons:
        face.use_smooth = smooth
    return obj


def box(name, location, scale, mat, collection, parent=None, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    move_to_collection(obj, collection, parent)
    if bevel:
        modifier = obj.modifiers.new('Manufactured edge radii', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 4
        modifier = obj.modifiers.new('Planar face normals', 'WEIGHTED_NORMAL')
        modifier.keep_sharp = True
    return obj


def cylinder(name, location, radius, depth, mat, collection, parent=None, axis='Z', vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if axis == 'X':
        obj.rotation_euler.y = math.pi / 2
    elif axis == 'Y':
        obj.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    move_to_collection(obj, collection, parent)
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    modifier = obj.modifiers.new('Machined edges', 'BEVEL')
    modifier.width = .003
    modifier.segments = 2
    return obj


def path(name, points, radius, mat, collection, parent=None, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for control, point in zip(spline.bezier_points, points):
        control.co = point
        control.handle_left_type = 'AUTO'
        control.handle_right_type = 'AUTO'
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def catmull_samples(points, steps=8):
    output = []
    for index in range(len(points) - 1):
        a = Vector(points[max(index - 1, 0)])
        b = Vector(points[index])
        c = Vector(points[index + 1])
        d = Vector(points[min(index + 2, len(points) - 1)])
        for step in range(steps):
            t = step / steps
            output.append(tuple(.5 * ((2 * b) + (-a + c) * t + (2*a - 5*b + 4*c - d) * t*t + (-a + 3*b - 3*c + d) * t*t*t)))
    output.append(tuple(points[-1]))
    return output
