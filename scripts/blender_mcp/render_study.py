"""Render review stills and save the final editable CABEK study.

Uses the same live Blender scene, actual geometry and lighting as the saved
source. Captures three category palettes, overhead entry and a vehicle detail.
Depends on build_studio.py, geometry.py and Blender Cycles.
"""

from pathlib import Path
import bpy
from geometry import aim

PROJECT=Path(__file__).resolve().parents[2]
OUTPUT=PROJECT/'assets/blender/cabek-studio-v1'


def render_category(scene,frame,name):
    scene.frame_set(frame)
    scene.render.filepath=str(OUTPUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('Rendered',name)


def save_study():
    scene=bpy.data.scenes['CABEK Cinematic Studio v1']
    bpy.context.window.scene=scene
    scene.frame_set(96)
    scene.render.resolution_x=1600
    scene.render.resolution_y=1000
    scene.cycles.samples=64
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'cabek-studio.blend'))


if __name__=='__main__':
    save_study()
