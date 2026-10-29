"""Export compact, self-contained GLBs from the CABEK Blender study.

Bakes evaluated geometry in a temporary scene, merges static parts, preserves
four rolling pivots and exports glTF PBR materials. The editable studio stays
intact. Depends on build_studio.py's saved scene, Blender and geometry.py.
"""

from collections import defaultdict
from pathlib import Path
import json
import math
import bpy
import io_scene_gltf2
from mathutils import Matrix,Vector
from geometry import empty

PROJECT=Path(__file__).resolve().parents[2]
DESTINATION=PROJECT/'public/models/studio-v1'
STUDIO_NAME='CABEK Cinematic Studio v1'


# ============================================================
# Bake authored surfaces while preserving normals and wheel pivots
# ============================================================

def evaluated_mesh_copy(source,matrix,collection,parent,depsgraph):
    evaluated=source.evaluated_get(depsgraph)
    data=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=depsgraph)
    normals=[normal.vector.copy() for normal in data.corner_normals]
    data.transform(matrix)
    normal_matrix=matrix.to_3x3().inverted().transposed()
    data.normals_split_custom_set([(normal_matrix@n).normalized() for n in normals])
    obj=bpy.data.objects.new('Export '+source.name,data)
    collection.objects.link(obj)
    obj.parent=parent
    return obj


def merge_parts(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    result=bpy.context.object
    result.name=name
    return result


def export_collection(studio,source_root,filename,vehicle=False):
    studio.frame_set(96)
    bpy.context.view_layer.update()
    depsgraph=bpy.context.evaluated_depsgraph_get()
    source_objects=[obj for obj in source_root.children_recursive if obj.type in ('MESH','CURVE','FONT')]
    alignment=Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-source_root.matrix_world.translation)
    wheel_sources=[obj for obj in source_root.children if obj.name.startswith('wheel_')] if vehicle else []
    source_groups={obj:(obj.parent if obj.parent in wheel_sources else None) for obj in source_objects}
    export_scene=bpy.data.scenes.new('CABEK temporary export')
    bpy.context.window.scene=export_scene
    root=empty('CABEK_Vehicle' if vehicle else 'CABEK_Tunnel',export_scene.collection)
    groups=defaultdict(list)
    pivots={}
    try:
        for source in wheel_sources:
            pivot=empty('Pivot '+source.name,export_scene.collection,root)
            pivot.location=alignment@source.matrix_world.translation
            pivots[source]=pivot
        for source in source_objects:
            pivot=pivots.get(source_groups[source],root)
            matrix=alignment@source.matrix_world
            if pivot!=root:
                matrix=Matrix.Translation(-pivot.location)@matrix
            copy=evaluated_mesh_copy(source,matrix,export_scene.collection,pivot,depsgraph)
            groups[pivot].append(copy)
        for pivot,objects in groups.items():
            merge_parts(objects,'GT body' if vehicle and pivot==root else 'Scan tunnel' if pivot==root else pivot.name+' mesh')
        root['units']='metres'
        root['forward']='negative glTF Z'
        if vehicle:
            root['wheel_radius_metres']=source_root['wheel_radius_metres']
        DESTINATION.mkdir(parents=True,exist_ok=True)
        format_items=io_scene_gltf2.ExportGLTF2_Base.__annotations__['export_format'].keywords['items']
        formats=[item[0] for item in format_items(None,bpy.context)]
        if 'GLB' not in formats:
            raise RuntimeError('This Blender exporter has no binary glTF support')
        bpy.ops.export_scene.gltf(filepath=str(DESTINATION/filename),export_format='GLB',
            use_active_scene=True,export_animations=False,export_cameras=False,
            export_lights=False,export_yup=True,export_extras=True,
            export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
            export_copyright='Car Concept: Eric Chadwick / Darmstadt Graphics Group GmbH, CC BY 4.0. CABEK tunnel: original project geometry.')
        print('Exported',filename)
    finally:
        bpy.context.window.scene=studio
        mesh_data=[obj.data for obj in export_scene.objects if obj.type=='MESH']
        for obj in list(export_scene.objects):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.scenes.remove(export_scene)
        for data in mesh_data:
            if data.users==0:
                bpy.data.meshes.remove(data)


def export_assets():
    studio=bpy.data.scenes[STUDIO_NAME]
    bpy.context.window.scene=studio
    export_collection(studio,bpy.data.objects['CABEK_Concept_GT'],'cabek-vehicle.glb',vehicle=True)
    export_collection(studio,bpy.data.objects['CABEK_ScanTunnel'],'cabek-tunnel.glb')
    print('GLBs exported; source scene retained')


if __name__=='__main__':
    export_assets()
