"""Render the three saved review cameras for comparing geometry to the five photos.

Run with the v3 source .blend open in background Blender. Cycles writes small
review stills alongside the scene without saving changes to the active camera.
"""
from pathlib import Path
import bpy

scene = bpy.context.scene
destination = Path(bpy.data.filepath).parent
for view in ('Exterior', 'Inspection', 'Service'):
    scene.camera = scene.objects['Review_'+view]
    scene.render.filepath = str(destination / (view.lower()+'.png'))
    bpy.ops.render.render(write_still=True)
