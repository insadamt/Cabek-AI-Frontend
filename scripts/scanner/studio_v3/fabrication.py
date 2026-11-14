"""Build editable sheet-metal assemblies with portable normals and planar UVs.

Depends on Blender meshes and mathutils. Parts of a rigid assembly share a mesh
so bolts, folds and brackets do not each cost a draw call in the runtime GLB.
"""
import math
import bpy
from mathutils import Vector


# ============================================================
# Fabricated sections in Blender metres
# ============================================================

class Assembly:
    def __init__(self):
        self.vertices = []
        self.faces = []
        self.indices = []
        self.materials = []

    def solid(self, vertices, faces, material):
        if material not in self.materials:
            self.materials.append(material)
        index = self.materials.index(material)
        offset = len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend(tuple(offset + i for i in face) for face in faces)
        self.indices.extend([index] * len(faces))

    def extrusion(self, profile, start, end, mat):
        # The profile runs counter-clockwise in X/Z, facing the near end (-Y).
        vertices = [(x, y, z) for y in (start, end) for x, z in profile]
        n = len(profile)
        faces = [tuple(range(n)), tuple(reversed(range(n, 2*n)))]
        faces += [(i, n+i, n+(i+1)%n, (i+1)%n) for i in range(n)]
        self.solid(vertices, faces, mat)

    def box(self, center, size, mat):
        x, y, z = center
        a, b, c = (v/2 for v in size)
        self.extrusion([(x-a,z-c),(x+a,z-c),(x+a,z+c),(x-a,z+c)], y-b, y+b, mat)

    def tube(self, points, radius, mat, sides=10):
        points = [Vector(p) for p in points]
        verts = []
        for i, p in enumerate(points):
            direction = (points[min(i+1,len(points)-1)] - points[max(0,i-1)]).normalized()
            guide = Vector((1,0,0)) if abs(direction.x) < .85 else Vector((0,1,0))
            u = direction.cross(guide).normalized()
            v = direction.cross(u)
            for k in range(sides):
                angle = 2*math.pi*k/sides
                verts.append(p + radius*(math.cos(angle)*u + math.sin(angle)*v))
        end = len(verts)-sides
        faces = [tuple(reversed(range(sides))), tuple(range(end, end+sides))]
        for row in range(len(points)-1):
            a = row*sides
            for k in range(sides):
                j = (k+1)%sides
                faces.append((a+k,a+j,a+sides+j,a+sides+k))
        self.solid(verts, faces, mat)

    def segment(self, a, b, thickness, depth, y, mat):
        # Cross-section normal follows the shoulder so trim sits flush on the angled steel.
        ax, az = a
        bx, bz = b
        length = math.hypot(bx-ax,bz-az)
        dx, dz = -(bz-az)/length*thickness/2, (bx-ax)/length*thickness/2
        self.extrusion([(ax-dx,az-dz),(bx-dx,bz-dz),(bx+dx,bz+dz),(ax+dx,az+dz)],
                       y-depth/2, y+depth/2, mat)

    def finish(self, name, collection, parent, bevel=0):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        for material in self.materials:
            mesh.materials.append(material)
        uv = mesh.uv_layers.new(name="FabricationUV")
        for face, index in zip(mesh.polygons, self.indices):
            face.material_index = index
            axis = max(range(3), key=lambda i: abs(face.normal[i]))
            for loop in face.loop_indices:
                p = mesh.vertices[mesh.loops[loop].vertex_index].co
                uv.data[loop].uv = (p[(axis+1)%3],p[(axis+2)%3])
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        obj.parent = parent
        if bevel:
            edge = obj.modifiers.new("Fold and machining radius", 'BEVEL')
            edge.width = bevel
            edge.segments = 2
            normal = obj.modifiers.new("Weighted flat faces", 'WEIGHTED_NORMAL')
            normal.keep_sharp = True
        return obj
