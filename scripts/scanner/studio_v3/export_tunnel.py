"""Export the edited CABEK_TUNNEL hierarchy from the open v3 .blend to the frontend.

Depends on Blender's glTF exporter. Run with the source scene open. Selection
isolates render cameras and studio lights. Modifiers are evaluated on export.
"""
from pathlib import Path
import bpy

PROJECT = Path(__file__).resolve().parents[3]
MODEL = PROJECT / 'public/models/studio-v3/cabek-tunnel.glb'


def export_tunnel():
    root = bpy.context.scene.objects['CABEK_TUNNEL']
    previous = list(bpy.context.selected_objects)
    active = bpy.context.view_layer.objects.active
    bpy.ops.object.select_all(action='DESELECT')
    try:
        for obj in [root, *root.children_recursive]:
            obj.select_set(True)
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        result = bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format='GLB',
            use_selection=True, export_apply=True, export_extras=True, export_yup=True,
            export_animations=False, export_cameras=False, export_lights=False,
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_texcoords=True, export_normals=True)
        if 'FINISHED' not in result:
            raise RuntimeError('Blender failed to export the tunnel')
    finally:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in previous:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = active


if __name__ == '__main__':
    export_tunnel()
