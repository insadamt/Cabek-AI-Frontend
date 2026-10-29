"""Author the CABEK industrial scanning tunnel in live Blender.

An open crown preserves overhead visibility; detailed optical towers, recessed
diffusers and separate category materials make lighting changes inspectable.
Depends on geometry.py and Blender bpy. Coordinates use metres and Z up.
"""

import math
import bpy
from geometry import box, cylinder, empty, mesh, path


# ============================================================
# Structural portal frames and optical equipment
# ============================================================

def portal_outline(y):
    return [(-1.84,y,.13),(-1.84,y,2.38),(-1.81,y,2.60),(-1.66,y,2.77),
            (-1.44,y,2.82),(1.44,y,2.82),(1.66,y,2.77),(1.81,y,2.60),
            (1.84,y,2.38),(1.84,y,.13)]


def extruded_portal(name,y,collection,root,materials,front=False):
    # Rectangular sections keep engineered flat surfaces and predictable clearance.
    outline = portal_outline(y)
    for side in (-1,1):
        box(name+' structural upright',(side*1.84,y,1.35),(.20,.30,2.49),materials['frame'],collection,root,.055)
        box(name+' cast pedestal',(side*1.84,y,.16),(.46,.58,.27),materials['aluminium'],collection,root,.065)
        box(name+' inset graphite panel',(side*1.725,y,1.40),(.019,.217,2.18),materials['dark'],collection,root,.006)
        box(name+' inner white diffuser',(side*1.71,y-.025,1.39),(.018,.06,2.12),materials['tunnel_white'],collection,root,.008)
        box(name+' category edge',(side*1.943,y-.081,1.40),(.009,.045,2.19),materials['category_primary'],collection,root,.004)
        path(name+' rounded crown',[(side*1.84,y,2.38),(side*1.81,y,2.60),
                                   (side*1.65,y,2.76),(side*1.44,y,2.82)], .10,materials['frame'],collection,root)
    if abs(y)>1:
        box(name+' crown beam',(0,y,2.82),(2.90,.30,.20),materials['frame'],collection,root,.052)
        box(name+' crown recess',(0,y-.156,2.82),(2.72,.013,.094),materials['dark'],collection,root,.011)
        box(name+' crown luminaire',(0,y-.166,2.82),(2.56,.009,.025),materials['category_primary'],collection,root,.009)
    for side in (-1,1):
        for z in (.42,2.26):
            cylinder(name+' flush assembly bolt',(side*1.84,y-.156,z),.019,.007,materials['gunmetal'],collection,root,axis='Y',vertices=6)
    if front:
        box('CABEK fascia',(0,y-.028,3.02),(3.65,.33,.27),materials['frame'],collection,root,.055)
        text_data = bpy.data.curves.new('CABEK optical wordmark','FONT')
        text_data.body = 'CABEK AI'
        text_data.align_x = 'CENTER'
        text_data.size = .155
        text_data.extrude = .0008
        text_data.materials.append(materials['tunnel_white'])
        text = bpy.data.objects.new('CABEK optical wordmark',text_data)
        collection.objects.link(text)
        text.parent = root
        text.location = (0,y-.199,2.965)
        text.rotation_euler = (math.pi/2,0,0)


def optical_pod(index,side,y,z,collection,root,materials):
    x = side*1.66
    box('Optic %02d arm'%index,(side*1.72,y,z),(.18,.11,.08),materials['gunmetal'],collection,root,.025)
    box('Optic %02d ceramic housing'%index,(x,y,z),(.12,.20,.20),materials['aluminium'],collection,root,.034)
    cylinder('Optic %02d recessed mount'%index,(x-side*.07,y,z),.069,.025,materials['dark'],collection,root,axis='X')
    cylinder('Optic %02d anodised lens rim'%index,(x-side*.087,y,z),.052,.02,materials['gunmetal'],collection,root,axis='X')
    cylinder('Optic %02d optical glass'%index,(x-side*.100,y,z),.038,.009,materials['lens'],collection,root,axis='X')
    cylinder('Optic %02d iris'%index,(x-side*.106,y,z),.018,.001,materials['glass'],collection,root,axis='X')
    cylinder('Optic %02d status lamp'%index,(x-side*.068,y-.07,z+.065),.008,.003,materials['category_secondary'],collection,root,axis='X',vertices=16)


# ============================================================
# Low scanning deck and independently coloured light sources
# ============================================================

def build_scanning_tunnel(collection,materials):
    root = empty('CABEK_ScanTunnel',collection)
    box('Scan plinth',(0,0,-.055),(4.12,6.90,.19),materials['deck'],collection,root,.08)
    box('Scanning deck finish',(0,0,.046),(3.34,6.73,.014),materials['floor'],collection,root,.025)
    for side in (-1,1):
        box('Floor light recessed channel',(side*1.39,0,.058),(.075,6.42,.014),materials['dark'],collection,root,.009)
        box('Floor category ribbon',(side*1.39,0,.067),(.023,6.36,.007),materials['category_primary'],collection,root,.003)
        box('Longitudinal equipment sill',(side*1.84,0,.19),(.18,6.26,.18),materials['frame'],collection,root,.035)
        box('Crown longitudinal extrusion',(side*1.76,0,2.77),(.12,5.65,.14),materials['aluminium'],collection,root,.026)
        for y in (-2.75,-1.38,0,1.38,2.75):
            box('Removable deck inspection cover',(side*1.585,y,.061),(.18,.27,.009),materials['aluminium'],collection,root,.015)
        for y in (-3.48,3.48):
            low_z,high_z=(0,.055) if y<0 else (.055,0)
            vertices=[(0,y-.19,low_z),(1.65,y-.19,low_z),
                      (1.65,y+.19,high_z),(0,y+.19,high_z)]
            vertices=[(side*x,yy,z) for x,yy,z in vertices]
            face=(0,1,2,3) if side>0 else (3,2,1,0)
            mesh('Flush approach ramp',vertices,[face],materials['deck'],collection,root)
    for index,y in enumerate((-2.70,0,2.70)):
        extruded_portal('Portal %02d'%index,y,collection,root,materials,front=index==0)
    index=0
    for side in (-1,1):
        for y in (-2.58,-1.3,0,1.3,2.58):
            if abs(y)==1.3:
                box('Intermediate optical upright',(side*1.83,y,1.42),(.11,.14,2.47),materials['aluminium'],collection,root,.027)
            for z in (.66,1.82):
                index+=1
                optical_pod(index,side,y,z,collection,root,materials)
    for side in (-1,1):
        for y in (-1.3,1.3):
            data=bpy.data.lights.new('Category wash','AREA')
            data.energy=65
            data.shape='RECTANGLE'
            data.size=1.8
            data.size_y=.45
            obj=bpy.data.objects.new('Category wash',data)
            collection.objects.link(obj)
            obj.parent=root
            obj.location=(side*1.65,y,1.1)
            from geometry import aim
            aim(obj,(0,y,.5))
    return root
