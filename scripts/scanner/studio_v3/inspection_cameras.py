"""Build the eight CABEK-branded bullet cameras at the operator-specified light rings.

Uses the tunnel stations, shared fabrication materials and the packed CABEK artwork.
The wall plate sits between the split inspection bars. Local depth points into the lane.
"""
import math
from mathutils import Vector
from fabrication import Assembly
from installation import RING_OFFSET, STATIONS

RING_DEPTHS = tuple(station + offset for station in STATIONS for offset in (-RING_OFFSET, RING_OFFSET))
CAMERA_RINGS = (1, 3, 4, 6)


def add_moulding(camera, point, sections, material):
    # Rounded rectangular sections taper the rear shell and bring the black hood forward over the lens.
    vertices = []
    for depth, half_width, half_height, radius in sections:
        for corner, (across, vertical) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
            for step in range(6):
                angle = (corner + step / 5) * math.pi / 2
                u = across * (half_width - radius) + radius * math.cos(angle)
                v = vertical * (half_height - radius) + radius * math.sin(angle)
                vertices.append(point(depth, u, v))
    count = 24
    last = len(vertices) - count
    faces = [tuple(reversed(range(count))), tuple(range(last, last + count))]
    for start in range(0, last, count):
        for i in range(count):
            j = (i + 1) % count
            faces.append((start+i, start+j, start+j+count, start+i+count))
    camera.solid(vertices, faces, material)


def build_cameras(emit, m, artwork):
    for side, side_name in [(-1, 'L'), (1, 'R')]:
        for index, ring in enumerate(CAMERA_RINGS, 1):
            y = RING_DEPTHS[ring - 1]
            mount = Vector((side * 1.947, y, .976))
            inward = Vector((-side, 0, 0))
            yaw = math.radians(48 if index % 2 else -48)
            direction = Vector((-side * math.cos(yaw), math.sin(yaw), 0))
            across = Vector((-direction.y, direction.x, 0))
            up = Vector((0, 0, 1))
            origin = mount + .112 * inward

            def point(depth, width=0, height=0):
                return origin + depth * direction + width * across + height * up

            camera = Assembly()
            camera.tube([mount, mount + .027 * inward], .060, m['cap'], 32)
            for angle in (0, 120, 240):
                a = math.radians(angle)
                screw = mount + .027 * inward + Vector((0, .048*math.cos(a), .048*math.sin(a)))
                camera.tube([screw, screw + .002 * inward], .004, m['screw'], 10)
            camera.tube([mount + .027*inward, mount + .057*inward], .035, m['cap'], 24)
            # The swivel neck seats in a domed socket behind the body.
            camera.tube([mount + .056*inward, origin], .024, m['alloy'], 24)
            add_moulding(camera, point, [
                (-.046, .015, .015, .014), (-.040, .025, .025, .024),
                (-.030, .032, .032, .031), (-.017, .034, .034, .033),
                (-.006, .031, .031, .030),
            ], m['cap'])
            camera.tube([point(-.025), point(.013)], .033, m['cap'], 24)
            add_moulding(camera, point, [
                (.000, .033, .038, .025), (.012, .042, .048, .022),
                (.032, .045, .050, .019), (.142, .045, .050, .019),
            ], m['cap'])
            add_moulding(camera, point, [
                (.142, .045, .050, .019), (.163, .045, .050, .019),
                (.167, .042, .047, .017),
            ], m['gasket'])
            def optical_window(depth, width, height):
                return point(depth, width, height + .008)
            add_moulding(camera, optical_window, [
                (.1666, .023, .024, .005), (.169, .022, .023, .0045),
            ], m['alloy'])
            camera.tube([point(.169, 0, .008), point(.171, 0, .008)], .016, m['glass'], 32)
            camera.tube([point(.171, 0, .008), point(.172, 0, .008)], .008, m['gasket'], 24)
            def illuminator(depth, width, height):
                return point(depth, width, height - .027)
            add_moulding(camera, illuminator, [
                (.1668, .015, .009, .004), (.1685, .014, .008, .003),
            ], m['frame'])
            for offset in (-.007, .007):
                camera.tube([point(.1686, offset, -.027), point(.1695, offset, -.027)], .006, m['reflector'], 16)

            # The supplied white lettering needs a dark print field on the white shell.
            prints = Assembly()
            corners = ((0, 0), (1, 0), (1, 1), (0, 1))
            for face in (-1, 1):
                def label(width, height, distance):
                    return point(.086 - face * width, face * distance, height)
                plate = []
                for corner, (u, v) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
                    for step in range(5):
                        angle = (corner + step / 4) * math.pi / 2
                        plate.append(label(u*.034 + .004*math.cos(angle),
                                           v*.021 + .004*math.sin(angle), .04515))
                camera.solid(plate, [tuple(range(len(plate)))], m['frame'])
                prints.solid([label((u-.5)*.083, (v-.5)*.083, .04545) for u,v in corners],
                             [(0, 1, 2, 3)], artwork)

            name = f'Camera_{side_name}{index:02}'
            body = emit(camera, 'CAMERAS', name, .0006)
            for face in body.data.polygons:
                face.use_smooth = True
            body.data.set_sharp_from_angle(angle=math.radians(35))
            body['inspection_ring'] = ring
            body['mount_y_m'] = y
            mark = emit(prints, 'CAMERAS', name + '_artwork', 0)
            mark.parent = body
            uv = mark.data.uv_layers.active
            for loop in mark.data.loops:
                uv.data[loop.index].uv = corners[loop.vertex_index % 4]
