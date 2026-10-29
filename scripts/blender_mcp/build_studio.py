"""Create the editable CABEK cinematic model study through Blender MCP.

Prepares an attributed coupe, original tunnel and 10-second entrance/colour study
in a separate scene. Depends on sibling modelling modules and Blender 5.x.
Keeps existing application assets and the user's original scene intact.
"""

from pathlib import Path
import math
import bpy
from mathutils import Vector
from geometry import aim, box, empty, linear_color, material
from vehicle_asset import import_vehicle
from scanning_tunnel import build_scanning_tunnel

PROJECT = Path('/home/insayd/Desktop/CDMA/Cabek AI/Cabek Frontend')
OUTPUT = PROJECT / 'assets/blender/cabek-studio-v1'
EXPORT = PROJECT / 'public/models/studio-v1'
SCENE_NAME = 'CABEK Cinematic Studio v1'
PALETTES = [('Expertise','a7e856','d9ffad'),('Chiffrage','36cee1','b5f6ff'),('Verification','a697ef','d6caff')]


# ============================================================
# Asset materials and non-destructive scene setup
# ============================================================

def make_materials():
    specifications = {
        'paint':('GT | ceramic pearl','eeeee5',.28,.235,0,1),
        'interior':('GT | graphite upholstery','29313a',0,.52,0,0),
        'glass':('GT | smoked optical glass','1a2831',.28,.085,0,1),
        'chrome':('GT | satin brightwork','c6cbd0',.88,.24,0,0),
        'mirror':('GT | mirror coating','bbc4ce',1,.07,0,0),
        'dark':('Shared | graphite polymer','151a20',.15,.30,0,0),
        'gap':('Shared | recessed shadow','080b0e',0,.64,0,0),
        'rubber':('GT | performance rubber','202326',0,.66,0,0),
        'alloy':('GT | forged aluminium','bfc6cc',.90,.22,0,0),
        'gunmetal':('Shared | gunmetal','48515a',.82,.33,0,0),
        'brake':('GT | ceramic rotor','737b7e',.78,.47,0,0),
        'caliper':('GT | titanium caliper','b98b49',.7,.34,0,0),
        'white_led':('GT | matrix white','edf7ff',0,.20,3,0),
        'red_led':('GT | rear red','ed253e',0,.25,3,0),
        'frame':('Tunnel | titanium graphite','17293b',.42,.30,0,0),
        'aluminium':('Tunnel | bead-blasted aluminium','aab6c0',.78,.38,0,0),
        'deck':('Tunnel | plinth edge','454d54',.54,.36,0,0),
        'floor':('Tunnel | ceramic deck','cbd0d0',.38,.37,0,0),
        'lens':('Tunnel | coated lens','214252',.72,.07,0,1),
        'tunnel_white':('Tunnel | neutral diffusers','edf5ff',0,.25,3,0),
        'category_primary':('CABEK_Category_Primary','a7e856',0,.25,3,0),
        'category_secondary':('CABEK_Category_Secondary','d9ffad',0,.25,2,0),
        'studio':('Studio | warm porcelain','dedfdd',.08,.38,0,0),
    }
    return {key:material(*values) for key,values in specifications.items()}


def prepare_scene():
    previous = bpy.data.scenes.get(SCENE_NAME)
    if previous:
        previous_collections=list(previous.collection.children)
        previous_data=[obj.data for obj in previous.objects if obj.data]
        previous_materials={slot.material for obj in previous.objects if obj.type=='MESH'
                            for slot in obj.material_slots if slot.material}
        # Only this authored study is rebuilt; unrelated scenes remain available.
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.scenes.remove(previous)
        for collection in previous_collections:
            if collection.users==0:
                bpy.data.collections.remove(collection)
        for data in set(previous_data):
            if data.users==0:
                bpy.data.batch_remove(ids=[data])
        for mat in previous_materials:
            if mat.users==0:
                bpy.data.materials.remove(mat)
    scene = bpy.data.scenes.new(SCENE_NAME)
    bpy.context.window.scene = scene
    scene.unit_settings.system='METRIC'
    scene.unit_settings.scale_length=1
    scene.render.engine='CYCLES'
    scene.cycles.samples=48
    scene.cycles.use_denoising=True
    scene.cycles.max_bounces=8
    scene.cycles.transparent_max_bounces=4
    scene.render.threads_mode='FIXED'
    scene.render.threads=6
    scene.render.resolution_x=1600
    scene.render.resolution_y=1000
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGB'
    scene.render.fps=24
    scene.frame_start=1
    scene.frame_end=240
    scene.view_settings.view_transform='AgX'
    scene.view_settings.exposure=-.25
    world=bpy.data.worlds.new('CABEK Studio world')
    world.use_nodes=True
    background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(.65,.70,.76,1)
    background.inputs['Strength'].default_value=.35
    scene.world=world
    collections={}
    for key,name in [('vehicle','CABEK Original GT'),('tunnel','CABEK Optical Tunnel'),('studio','CABEK Studio Lighting')]:
        collection=bpy.data.collections.new(name)
        scene.collection.children.link(collection)
        collections[key]=collection
    return scene,collections


# ============================================================
# Studio reflections and keyframed presentation
# ============================================================

def add_softbox(collection,name,position,target,power,size,size_y,color=(1,1,1)):
    data=bpy.data.lights.new(name,'AREA')
    data.shape='RECTANGLE'
    data.energy=power
    data.size=size
    data.size_y=size_y
    data.color=color
    obj=bpy.data.objects.new(name,data)
    collection.objects.link(obj)
    obj.location=position
    aim(obj,target)
    return obj


def make_studio(scene,collection,materials):
    box('Infinite porcelain floor',(0,0,-.06),(200,200,.12),materials['studio'],collection,bevel=.03)
    add_softbox(collection,'Key | long automotive strip',(2,-4,8),(0,0,0),1550,7,3)
    add_softbox(collection,'Fill | cool silk',(-5,-1,5),(0,0,.7),1000,5,6,(.82,.91,1))
    add_softbox(collection,'Rim | roof reflection',(1,5,7),(0,0,.5),2100,6,2,(1,.94,.85))
    add_softbox(collection,'Front | face fill',(0,-7,3),(0,0,1),400,3,2)
    camera_data=bpy.data.cameras.new('CABEK presentation camera')
    camera=bpy.data.objects.new('CABEK presentation camera',camera_data)
    collection.objects.link(camera)
    camera_data.lens=48
    scene.camera=camera
    return camera


def animate_study(scene,vehicle,wheels,tunnel,camera,materials):
    wheel_radius=vehicle['wheel_radius_metres']
    for frame,y,eye,target in [(1,7.2,(-3,-4,20),(0,2.7,.2)),
                               (60,1.3,(-7,-9.5,15),(0,.3,.55)),
                               (96,0,(-7.6,-10.5,14),(0,0,.55)),
                               (240,0,(-7.6,-10.5,14),(0,0,.55))]:
        vehicle.location=(0,y,.061 if frame>1 else .004)
        vehicle.keyframe_insert(data_path='location',frame=frame)
        camera.location=eye
        aim(camera,target)
        camera.keyframe_insert(data_path='location',frame=frame)
        camera.keyframe_insert(data_path='rotation_euler',frame=frame)
        for wheel in wheels:
            wheel.rotation_euler.x=(7.2-y)/wheel_radius
            wheel.keyframe_insert(data_path='rotation_euler',frame=frame)
    for frame,palette_index in [(1,0),(96,0),(132,1),(168,1),(204,2),(240,2)]:
        _,primary,secondary=PALETTES[palette_index]
        for name,color in [('category_primary',primary),('category_secondary',secondary)]:
            shader=next(n for n in materials[name].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            for socket in ('Base Color','Emission Color'):
                shader.inputs[socket].default_value=linear_color(color)
                shader.inputs[socket].keyframe_insert(data_path='default_value',frame=frame)
        for obj in tunnel.children:
            if obj.type=='LIGHT':
                obj.data.color=linear_color(primary)[:3]
                obj.data.keyframe_insert(data_path='color',frame=frame)
    for name,frame in [('Overhead approach',1),('Parked expertise',96),('Quick estimate cyan',150),('Verification violet',224)]:
        scene.timeline_markers.new(name,frame=frame)
    scene.frame_set(96)


def build():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    EXPORT.mkdir(parents=True,exist_ok=True)
    scene,collections=prepare_scene()
    materials=make_materials()
    vehicle,wheels=import_vehicle(collections['vehicle'],materials)
    tunnel=build_scanning_tunnel(collections['tunnel'],materials)
    tunnel['optical_modules']=20
    camera=make_studio(scene,collections['studio'],materials)
    animate_study(scene,vehicle,wheels,tunnel,camera,materials)
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'cabek-studio.blend'))
    print('Built',len(scene.objects),'objects; saved editable study to',OUTPUT)
    return scene


if __name__=='__main__':
    build()
