"""Prepare the attributed concept car for the CABEK Blender scene.

Retains the detailed source geometry/interior and PBR maps, replaces branded
paint/plate surfaces, and creates centred rolling pivots with fixed calipers.
Depends on the pinned source from fetch_vehicle_source.py, geometry.py and bpy.
"""

from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix, Vector
from geometry import empty, linear_color, move_to_collection

SOURCE=Path(__file__).resolve().parents[2]/'assets/blender/cabek-studio-v1/source/CarConcept.gltf'
WHEEL_NAMES={'WheelFrontL':'wheel_fl','WheelFrontR':'wheel_fr','WheelRearL':'wheel_rl','WheelRearR':'wheel_rr'}


def smooth_glazing_surface(obj):
    # Welding coincident export vertices removes the visible triangulation in
    # broad studio reflections; loop UVs remain attached to their original faces.
    obj.data.normals_split_custom_set([(0,0,0)]*len(obj.data.loops))
    editable=bmesh.new()
    editable.from_mesh(obj.data)
    bmesh.ops.remove_doubles(editable,verts=list(editable.verts),dist=.00001)
    bmesh.ops.recalc_face_normals(editable,faces=list(editable.faces))
    has_boundary=any(edge.is_boundary for edge in editable.edges)
    editable.to_mesh(obj.data)
    editable.free()
    for face in obj.data.polygons:
        face.use_smooth=True
    if has_boundary and 'RoofPanel' not in obj.name:
        thickness=obj.modifiers.new('Optical glass thickness','SOLIDIFY')
        thickness.thickness=.003
        thickness.offset=-1


# ============================================================
# Preserve the authored mesh and replace only CABEK presentation surfaces
# ============================================================

def import_vehicle(collection,materials):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    imported=set(bpy.data.objects)-before
    meshes=[obj for obj in imported if obj.type=='MESH']
    source_wheels={name:next(obj for obj in imported if obj.name.split('.')[0]==name) for name in WHEEL_NAMES}
    moving_parts={name:[obj for obj in pivot.children_recursive if obj.type=='MESH' and 'BrakePad' not in obj.name]
                  for name,pivot in source_wheels.items()}
    tyre=next(obj for obj in moving_parts['WheelFrontL']
              if any(slot.material and slot.material.name.startswith('Tiretread') for slot in obj.material_slots))
    bpy.context.view_layer.update()
    matrices={obj:obj.matrix_world.copy() for obj in imported}
    custom_normals={obj:[normal.vector.copy() for normal in obj.data.corner_normals] for obj in meshes}
    coordinates=[matrices[obj]@vertex.co for obj in meshes for vertex in obj.data.vertices]
    minimum=Vector([min(p[i] for p in coordinates) for i in range(3)])
    maximum=Vector([max(p[i] for p in coordinates) for i in range(3)])
    scale=4.75/(maximum.y-minimum.y)
    offset=Vector((-(minimum.x+maximum.x)/2,-(minimum.y+maximum.y)/2,-minimum.z))
    normalization=Matrix.Scale(scale,4)@Matrix.Translation(offset)
    root=empty('CABEK_Concept_GT',collection)
    root['source']='Car Concept — Eric Chadwick / Darmstadt Graphics Group GmbH, 2024; CC BY 4.0'
    root['changes']='Pearl/graphite paint, unbranded exterior, material tuning, rolling pivots, Blender scene'
    for obj in meshes:
        matrix=normalization@matrices[obj]
        obj.parent=None
        obj.matrix_world=Matrix.Identity(4)
        obj.data.transform(matrix)
        normal_matrix=matrix.to_3x3().inverted().transposed()
        obj.data.normals_split_custom_set([(normal_matrix@normal).normalized() for normal in custom_normals[obj]])
        move_to_collection(obj,collection,root)
        for slot in obj.material_slots:
            if not slot.material:
                continue
            name=slot.material.name.split('.')[0]
            if name.startswith('Paint 1'):
                slot.material=materials['paint']
            elif name.startswith('Paint 2'):
                slot.material=materials['dark']
            elif name.startswith('Interior 3'):
                slot.material=materials['interior']
            elif name=='License':
                slot.material=materials['dark']
            elif name=='Glass':
                shader=next(n for n in slot.material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
                shader.inputs['Base Color'].default_value=linear_color('dfe7ea')
                shader.inputs['Roughness'].default_value=.035
                shader.inputs['Transmission Weight'].default_value=.98
                shader.inputs['IOR'].default_value=1.46
        if any(term in obj.name for term in ('Windshield','RoofPanel','Rearwindow','DoorRWindow','DoorLWindow','WindowsRearSides')) and 'Gasket' not in obj.name and 'Wipers' not in obj.name:
            smooth_glazing_surface(obj)
    # Meshes are flattened first so new pivots have a consistent local X axis.
    wheels=[]
    for source_name,name in WHEEL_NAMES.items():
        old_pivot=source_wheels[source_name]
        center=normalization@matrices[old_pivot].translation
        wheel=empty(name,collection,root)
        wheel.location=center
        for obj in moving_parts[source_name]:
            obj.data.transform(Matrix.Translation(-center))
            obj.parent=wheel
        wheels.append(wheel)
    for obj in list(imported):
        if obj.type!='MESH':
            bpy.data.objects.remove(obj,do_unlink=True)
    root['wheel_radius_metres']=max(v.co.z for v in tyre.data.vertices)-min(v.co.z for v in tyre.data.vertices)
    root['wheel_radius_metres']/=2
    print('Imported detailed car; length 4.75 m, wheel radius',root['wheel_radius_metres'])
    return root,wheels
