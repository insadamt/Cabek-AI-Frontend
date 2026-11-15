"""Model the three photographed CABEK sleeves, split inspection bars and exterior RGB fixtures.

Uses fabrication.Assembly and shared Blender PBR materials. Dimensions are
photo estimates in metres around the separate 4.8 m sedan. Blender -Y is entry.
"""
from fabrication import Assembly

STATIONS = (-2.52, 0, 2.52)
HALF_SLEEVE = .69
RING_OFFSET = .615
SECTIONS = [(1.94, 2.36), (1.26, 2.74), (-1.26, 2.74), (-1.94, 2.36)]


def build_modules(emit, m):
    for i, y in enumerate(STATIONS, 1):
        suffix = f"{i:02}"
        skins, roof, structure = Assembly(), Assembly(), Assembly()
        for side in (-1, 1):
            x = side*1.98
            skins.box((x,y,1.245), (.066,1.38,2.19),m['coat'])
            for edge in (-1, 1):
                yy = y+edge*(HALF_SLEEVE-.027)
                structure.box((side*2.005,yy,1.25),(.115,.060,2.24),m['frame'])
                structure.box((side*1.922,yy,1.24),(.020,.058,2.16),m['gasket'])
                for z in (.22,1.2,2.29):
                    structure.tube([(side*2.060,yy,z),(side*2.069,yy,z)],.013,m['screw'],6)
                structure.box((x,yy,.142),(.104,.096,.044),m['zinc'])
                structure.box((x+.036,yy,.096),(.012,.072,.069),m['zinc'])
                structure.tube([(x-.030,yy,.075),(x+.030,yy,.075)],.073,m['wheel'],20)
                structure.tube([(x-.033,yy,.075),(x+.033,yy,.075)],.046,m['rubber'],20)
            for z in (.18,2.32):
                structure.box((side*2.005,y,z),(.11,1.37,.059),m['frame'])
        outer = [(x*1.055,z+.108) for x,z in SECTIONS]
        profile = outer + list(reversed(SECTIONS))
        roof.extrusion(profile, y-HALF_SLEEVE, y+HALF_SLEEVE, m['coat'])
        for side in (-1,1):
            roof.box((side*1.998,y,2.379),(.114,1.38,.102),m['coat'])
        # Pale inner reflectors follow the folded roof and stop short of its black end trim.
        for a,b in zip(SECTIONS,SECTIONS[1:]):
            roof.segment(a,b,.010,1.29,y,m['reflector'])
        for edge in (-1,1):
            yy = y+edge*(HALF_SLEEVE-.035)
            for a,b in zip(SECTIONS,SECTIONS[1:]):
                roof.segment((a[0],a[1]-.018),(b[0],b[1]-.018),.048,.070,yy,m['frame'])
        emit(structure,'STRUCTURE','Portal_'+suffix,.0025)
        emit(skins,'EXTERIOR_PANELS','Side_sheets_'+suffix,.007)
        emit(roof,'ROOF','Folded_canopy_'+suffix,.004)

    ties = Assembly()
    for side in (-1,1):
        for y in (-1.26,1.26):
            for z in (.17,2.32):
                ties.box((side*2.008,y,z),(.061,1.18,.074), m['zinc'])
                for end in (-1,1):
                    yy=y+end*.55
                    ties.box((side*2.044,yy,z),(.009,.14,.082),m['frame'])
                    ties.tube([(side*2.047,yy,z),(side*2.056,yy,z)],.014,m['screw'],6)
    emit(ties,'STRUCTURE','Box_section_ties_and_splices',.002)


def build_lights(emit, m):
    for i,y in enumerate(STATIONS,1):
        for edge,offset in [('A',-RING_OFFSET),('B',RING_OFFSET)]:
            yy = y+offset
            housings, white = Assembly(), Assembly()
            for side in (-1,1):
                for low,high in [(.19,.90),(1.055,2.315)]:
                    middle=(low+high)/2
                    housings.box((side*1.925,yy,middle),(.049,.067,high-low+.033),m['alloy'])
                    white.box((side*1.894,yy,middle),(.020,.047,high-low),m['white'])
                    for z in (low-.01, high+.01):
                        housings.box((side*1.91,yy,z),(.060,.072,.020),m['cap'])
            lamp_id = f"Inspection_{i:02}_{edge}"
            emit(housings,'INSPECTION_LIGHTS',lamp_id+'_side_channels',.003)
            emit(white,'INSPECTION_LIGHTS',lamp_id+'_vertical',.004)['light_group']='inspection.white'
            housings, white = Assembly(), Assembly()
            for a,b in zip(SECTIONS,SECTIONS[1:]):
                ax,az=a
                bx,bz=b
                steps = [(0.05,.95)] if az != bz else [(.035,.483),(.517,.965)]
                for start,end in steps:
                    def point(t,drop):
                        return ax+(bx-ax)*t, az+(bz-az)*t-drop
                    housings.segment(point(start,.041),point(end,.041),.038,.067,yy,m['alloy'])
                    white.segment(point(start+.007,.066),point(end-.007,.066),.021,.049,yy,m['white'])
            for part,name in [(housings,'roof_channels'),(white,'crown')]:
                obj=emit(part,'INSPECTION_LIGHTS',lamp_id+'_'+name,.0025)
                obj['canopy_mount']=True
                if part is white:
                    obj['light_group']='inspection.white'
    build_exterior_lights(emit, m)


def build_exterior_lights(emit, m):
    channel = Assembly()
    entry_face = STATIONS[0] - HALF_SLEEVE - .003
    for side, label in [(-1, 'L'), (1, 'R')]:
        logo_y = STATIONS[1]
        channel.box((side*2.066, logo_y, 2.32), (.016, .936, .038), m['gasket'])
        channel.box((side*2.005, entry_face-.007, 1.27), (.038, .016, 1.356), m['gasket'])

        # Each fixture has its own mount; all four diffusers share the analog strip's RGB material.
        above_logo = Assembly()
        above_logo.box((side*2.077, logo_y, 2.32), (.008, .90, .025), m['rgb'])
        entrance = Assembly()
        entrance.box((side*2.005, entry_face-.018, 1.27), (.025, .008, 1.32), m['rgb'])
        for position, diffuser in [('Logo', above_logo), ('Entrance', entrance)]:
            obj = emit(diffuser, 'RGB_LIGHTS', f'Exterior_RGB_{position}_{label}', .002)
            obj['light_group'] = 'exterior.rgb'
    emit(channel,'RGB_LIGHTS','RGB_aluminium_channels',.002)
