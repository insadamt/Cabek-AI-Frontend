"""Model the finished entrance cabinet and apply the supplied CABEK AI graphics.

Uses the first portal station, the shared fabrication builder and the packed
RGBA artwork. The operator stands outside the lane facing the +X cabinet door.
"""
import bpy

from fabrication import Assembly
from installation import STATIONS


# ============================================================
# Closed entrance cabinet and centered operator touchscreen
# ============================================================

CABINET_Y = STATIONS[0]
DOOR_CENTER_Z = 1.215
SCREEN_CENTER_Z = DOOR_CENTER_Z + .15


def build_rack_frame(emit, steel):
    frame = Assembly()
    end_offset = .636
    for end in (-1, 1):
        y = CABINET_Y + end * end_offset
        for x in (2.038, 2.485):
            frame.box((x, y, DOOR_CENTER_Z), (.044, .048, 2.15), steel)

    # The crossmembers follow the shelf levels of the original equipment rack.
    for z in (.162, 1.14, 1.77, 2.268):
        for end in (-1, 1):
            frame.box((2.2615, CABINET_Y + end * end_offset, z), (.403, .045, .044), steel)
        frame.box((2.485, CABINET_Y, z), (.044, 1.224, .044), steel)
    emit(frame, 'TECHNICAL_EQUIPMENT', 'Entry_cabinet_rack_frame', .003)


def build_slotted_ends(emit, coat):
    cheeks = Assembly()
    width = .403
    left = 2.060
    pitch = .101
    for end in (-1, 1):
        y = CABINET_Y + end * .646
        for row in range(33):
            z = .205 + row * .062
            cheeks.box((left + width / 2, y, z), (width, .010, .046), coat)
            # Stagger the webs between adjacent slots, as on the photographed rack cheeks.
            for column in range(5):
                start = column * pitch - (row % 2) * pitch / 2
                low, high = max(0, start), min(width, start + .041)
                if high > low:
                    cheeks.box((left + (low + high) / 2, y, z + .031),
                               (high - low, .010, .016), coat)
    emit(cheeks, 'TECHNICAL_EQUIPMENT', 'Entry_cabinet_slotted_cheeks', 0)


def build_cabinet(emit, materials):
    plinth = Assembly()
    plinth.box((2.257, CABINET_Y, .073), (.425, 1.18, .144), materials['frame'])
    emit(plinth, 'TECHNICAL_EQUIPMENT', 'Entry_cabinet_plinth', .009)

    # The dark inner shell closes the lane face and backs every opening in the outer cheeks.
    shell = Assembly()
    shell.box((2.243, CABINET_Y, DOOR_CENTER_Z), (.454, 1.258, 2.14), materials['gasket'])
    emit(shell, 'TECHNICAL_EQUIPMENT', 'Entry_cabinet_enclosure', .005)
    build_rack_frame(emit, materials['frame'])
    build_slotted_ends(emit, materials['coat'])

    door = Assembly()
    door.box((2.472, CABINET_Y, DOOR_CENTER_Z), (.018, 1.232, 2.102), materials['coat'])
    door.box((2.493, CABINET_Y, SCREEN_CENTER_Z), (.028, .596, .36), materials['frame'])
    emit(door, 'TECHNICAL_EQUIPMENT', 'Entry_cabinet_door', .005)

    display = Assembly()
    display.box((2.513, CABINET_Y, SCREEN_CENTER_Z), (.018, .612, .380), materials['frame'])
    display.box((2.523, CABINET_Y, SCREEN_CENTER_Z), (.008, .598, .366), materials['gasket'])
    display.box((2.528, CABINET_Y, SCREEN_CENTER_Z), (.006, .566, .320), materials['display'])
    emit(display, 'TECHNICAL_EQUIPMENT', 'Operator_touchscreen', .003)


# ============================================================
# Shared transparent artwork oriented for each viewing side
# ============================================================

def build_branding(emit, source_image):
    image = bpy.data.images.load(str(source_image), check_existing=True)
    image.pack()
    image.filepath = '//' + source_image.name
    decal = bpy.data.materials.new('CABEK_AI_artwork')
    decal.use_nodes = True
    decal.use_backface_culling = True
    tree = decal.node_tree
    surface = next(node for node in tree.nodes if node.type == 'BSDF_PRINCIPLED')
    surface.inputs['Roughness'].default_value = .46
    texture = tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.location = (-620, 240)
    cutout = tree.nodes.new('ShaderNodeMath')
    cutout.operation = 'ROUND'
    cutout.location = (-330, 60)
    tree.links.new(texture.outputs['Color'], surface.inputs['Base Color'])
    tree.links.new(texture.outputs['Alpha'], cutout.inputs[0])
    tree.links.new(cutout.outputs[0], surface.inputs['Alpha'])

    def place_logo(name, group, x, y, z, size, side):
        half_width = size / 2
        half_height = half_width * image.size[1] / image.size[0]
        quad = Assembly()
        corners = [(0, 0), (1, 0), (1, 1), (0, 1)]
        vertices = [(x, y + side * (2*u-1) * half_width, z + (2*v-1) * half_height)
                    for u, v in corners]
        quad.solid(vertices, [(0, 1, 2, 3)], decal)
        obj = emit(quad, group, name, 0)
        uv = obj.data.uv_layers.active
        for loop in obj.data.loops:
            uv.data[loop.index].uv = corners[loop.vertex_index]

    # Reversing the width axis on the left keeps the graphic readable from outside both panels.
    for side, label in [(1, 'R'), (-1, 'L')]:
        place_logo('Panel_logo_' + label, 'BRANDING', side * 2.015, 0, 1.52, 1.26, side)
    place_logo('Touchscreen_splash', 'TECHNICAL_EQUIPMENT', 2.532, CABINET_Y, SCREEN_CENTER_Z, .28, 1)
