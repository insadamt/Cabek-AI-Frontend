"""Author the open service rack and CABEK IA panel lettering seen in the side views.

Uses the shared native fabrication mesh builder and Blender's built-in vector
font. No private photo, font file or external texture is needed by the asset.
"""
import math
import bpy
from fabrication import Assembly


def build_cabinet(emit, m):
    rack, slots, devices, wiring = Assembly(), Assembly(), Assembly(), Assembly()
    yc=2.52
    for x in (2.09,2.51):
        for y in (yc-.64,yc+.64):
            rack.box((x,y,1.23),(.044,.047,2.15),m['frame'])
    for z in (.19,1.14,1.77,2.27):
        for y in (yc-.64,yc+.64):
            rack.box((2.30,y,z),(.46,.045,.044),m['frame'])
        rack.box((2.51,yc,z),(.049,1.32,.049),m['frame'])
    # Form real open vent slots in the end cheeks. Each staggered row shares its top flange.
    for y in (yc-.64,yc+.64):
        for row in range(32):
            z=.24+row*.061
            slots.box((2.30,y,z),(.39,.011,.047),m['coat'])
            length=.39
            start=2.105
            for col in range(5):
                left=max(0,col*.101-(row%2)*.050)
                right=min(length,col*.101+.041-(row%2)*.050)
                if left<right:
                    slots.box((start+(left+right)/2,y,z+.0305),(right-left,.011,.014),m['coat'])
    rack.box((2.29,yc,1.14),(.415,1.27,.028),m['zinc'])
    devices.box((2.33,yc-.28,1.20),(.323,.45,.083),m['cap'])
    devices.box((2.31,yc+.20,1.21),(.31,.39,.13),m['gasket'])
    devices.box((2.32,yc+.2,1.28),(.28,.36,.008),m['frame'])
    for i in range(7):
        devices.box((2.469,yc+.055+i*.048,1.22),(.008,.031,.021),m['rubber'])
    for i in range(7):
        y=yc-.43+i*.034
        points=[(2.14,y,2.20),(2.16,y+.02,1.99),(2.20,y+.08,1.72),
                (2.24,y+.18,1.43+i*.012),(2.32,y+.26,1.32),(2.41,y+.24,1.26)]
        wiring.tube(points,.005 if i%3 else .007,[m['cap'],m['lead'],m['rubber']][i%3],8)
    for z in (1.76,2.17):
        wiring.box((2.157,yc-.31,z),(.045,.27,.024),m['rubber'])
    emit(rack,'TECHNICAL_EQUIPMENT','Service_rack_and_shelf',.003)
    emit(slots,'TECHNICAL_EQUIPMENT','Slotted_rack_cheeks',0)
    emit(devices,'TECHNICAL_EQUIPMENT','Recorder_and_switch',.004)
    emit(wiring,'TECHNICAL_EQUIPMENT','Low_voltage_looms',0)


def build_branding(emit, groups, m):
    for side, label in [(1,'R'),(-1,'L')]:
        badge=Assembly()
        # The photographed C is formed by three concentric open strokes around lowercase lettering.
        for radius in (.360,.294,.228):
            for i in range(48):
                a=math.radians(44+i*272/48)
                b=math.radians(44+(i+1)*272/48)
                def corner(r,theta):
                    return (side*2.018,side*(-.13+r*math.cos(theta)),1.56+r*math.sin(theta))
                verts=[corner(radius-.015,a),corner(radius+.015,a),
                       corner(radius+.015,b),corner(radius-.015,b)]
                badge.solid(verts,[(0,1,2,3)],m['vinyl'])
        emit(badge,'BRANDING','Concentric_C_'+label,0)
        collection, parent=groups['BRANDING']
        for letters,y,scale,mat in [('abek',-.225,.259,'vinyl'),('IA',.334,.207,'green')]:
            font=bpy.data.curves.new('Sign lettering','FONT')
            font.body=letters
            font.size=scale
            font.offset=.0025
            font.resolution_u=6
            font.materials.append(m[mat])
            obj=bpy.data.objects.new('Lettering_'+letters+'_'+label,font)
            collection.objects.link(obj)
            obj.parent=parent
            obj.location=(side*2.020,side*y,1.50)
            obj.rotation_euler=(math.pi/2,0,side*math.pi/2)
            # Portable vector signage remains editable on the source. Export converts it to mesh.
