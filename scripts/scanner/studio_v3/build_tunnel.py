"""Build the CABEK photo-reference scene from native Blender assemblies.

Depends on Blender, the adjacent fabrication modules and the existing studio
material helpers. The saved .blend is the editing master. Export subsequent
artist edits with export_tunnel.py without running this generator again.
"""
from pathlib import Path
import sys
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[2]
sys.path[:0] = [str(HERE), str(PROJECT/'scripts/blender_mcp')]
from geometry import empty, material
from fabrication import Assembly
from installation import build_modules, build_lights
from inspection_cameras import build_cameras
from service_bay import build_branding, build_cabinet
from export_tunnel import export_tunnel

SOURCE = PROJECT / 'assets/blender/cabek-studio-v3'
GROUPS = ('STRUCTURE','EXTERIOR_PANELS','ROOF','FLOOR','INSPECTION_LIGHTS','RGB_LIGHTS',
          'CAMERAS','TECHNICAL_EQUIPMENT','BRANDING')


def make_palette():
    palette = {
        'coat': ('Graphite_powder_coat','38383C',.20,.49),
        'frame': ('Folded_black_steel','25282B',.32,.39),
        'zinc': ('Galvanized_tie_stock','9D9E9E',.72,.37),
        'alloy': ('Satin_aluminium_channels','757D81',.78,.33),
        'screw': ('Black_zinc_fasteners','505458',.75,.32),
        'rubber': ('Charcoal_elastomer','282A2D',.02,.71),
        'wheel': ('Polyurethane_tread','A85629',.04,.51),
        'reflector': ('Pale_reflector_enamel','AFB3B8',.35,.37),
        'gasket': ('Black_seals','1D2023',.02,.62),
        'glass': ('Coated_optical_glass','172833',.28,.11),
        'cap': ('Camera_and_endcap_polymer','EAEBE9',.02,.36),
        'white': ('Inspection_Opal','F3F6FA',.02,.29,2.5),
        'rgb': ('Exterior_RGB','FFFFFF',.0,.32,.8),
        'display': ('Touchscreen_LCD','172D38',.13,.24,.30),
        'slab': ('Neutral_studio_concrete','D4D5D3',.04,.66),
    }
    materials = {k:material(*spec) for k,spec in palette.items()}
    for key, surface in materials.items():
        surface.use_backface_culling = True
        shader = next(n for n in surface.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        shader.inputs['Coat Roughness'].default_value = .03
        if key == 'white':
            shader.inputs['Transmission Weight'].default_value = .09
            shader.inputs['IOR'].default_value = 1.49
    return materials


def setup_review(scene):
    collection=bpy.data.collections.new('Studio review')
    scene.collection.children.link(collection)
    def positioned(name,data,position,target):
        obj=bpy.data.objects.new(name,data)
        collection.objects.link(obj)
        obj.location=position
        obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
        return obj
    for name,pos,power,size in [('Key',(-4,-5,7),920,5),('Cabinet fill',(5,1,5),780,4),
                                ('Roof softbox',(0,3,7),680,5)]:
        lamp=bpy.data.lights.new(name,'AREA')
        lamp.energy=power
        lamp.shape='DISK'
        lamp.size=size
        positioned(name,lamp,pos,(0,0,1))
    for name,pos,target,lens in [
        ('Review_Exterior',(8.8,-9.8,4.65),(0,.25,1.33),48),
        ('Review_Inspection',(.24,-8.0,1.48),(0,.1,1.30),35),
        ('Review_Service',(6.7,-4.85,2.45),(2.19,-1.90,1.22),44)]:
        lens_data=bpy.data.cameras.new(name)
        lens_data.lens=lens
        camera=positioned(name,lens_data,pos,target)
        if name=='Review_Exterior':
            scene.camera=camera
    if scene.world is None:
        scene.world=bpy.data.worlds.new('Neutral studio')
    scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    bg.inputs['Color'].default_value=(.54,.56,.60,1)
    bg.inputs['Strength'].default_value=.65
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1000
    scene.render.resolution_y=660
    scene.render.resolution_percentage=100
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                view=area.spaces.active
                view.region_3d.view_perspective='CAMERA'
                view.overlay.show_overlays=False
                view.shading.color_type='MATERIAL'


def build():
    scene=bpy.context.scene
    if bpy.data.filepath or set(o.name for o in scene.objects)-{'Cube','Camera','Light'}:
        raise RuntimeError('Build in a new default Blender file to preserve open work.')
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj,do_unlink=True)
    scene.name='CABEK inspection tunnel'
    scene.unit_settings.system='METRIC'
    collection=bpy.data.collections.new('CABEK_TUNNEL')
    scene.collection.children.link(collection)
    root=empty('CABEK_TUNNEL',collection)
    groups={}
    for name in GROUPS:
        child=bpy.data.collections.new(name)
        collection.children.link(child)
        groups[name]=(child,empty(name,child,root))
    def emit(batch,group,name,radius):
        return batch.finish(name,*groups[group],radius)
    m=make_palette()
    build_modules(emit,m)
    build_lights(emit,m)
    build_cabinet(emit,m)
    artwork = build_branding(emit, SOURCE/'cabek-ai-logo.png')
    build_cameras(emit, m, artwork)
    floor=Assembly()
    floor.box((0,0,-.014),(100,100,.026),m['slab'])
    emit(floor,'FLOOR','Studio_slab',0)
    setup_review(scene)
    SOURCE.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'cabek-studio.blend'),compress=True)
    export_tunnel()


if __name__=='__main__':
    build()
