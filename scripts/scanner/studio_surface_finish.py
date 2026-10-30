"""Give the imported studio restrained, physically scaled manufactured finishes.

Depends on Blender's shader nodes and runtime GLB material/object names. glTF
retains portable PBR factors; this editable Blender layer adds microscopic
roughness and machining grain to approximate the frontend procedural finish.
Vehicle texture maps, normal maps and geometry remain authored source data.
"""

from dataclasses import dataclass


FINISH_VERSION = 1


@dataclass(frozen=True)
class SurfaceFinish:
    label: str
    roughness_range: tuple[float, float]
    texture_scale: tuple[float, float, float]
    bump_distance: float
    metallic: float
    anisotropy: float = 0.0


POWDER_COAT = SurfaceFinish(
    'Fine graphite powder coat', (0.36, 0.43), (850, 850, 850), 0.000055, 0.04,
)
BRUSHED_ALUMINIUM = SurfaceFinish(
    'Satin aluminium machining grain', (0.25, 0.31), (1100, 7, 1100), 0.000018, 0.92, 0.38,
)
MACHINED_ALUMINIUM = SurfaceFinish(
    'Machined edge grain', (0.22, 0.27), (1250, 9, 1250), 0.000012, 0.95, 0.3,
)
STAINLESS_DECK = SurfaceFinish(
    'Longitudinal stainless brushing', (0.27, 0.34), (1400, 5, 1400), 0.000025, 0.88, 0.46,
)
STUDIO_FLOOR = SurfaceFinish(
    'Sealed matte studio floor', (0.81, 0.9), (65, 65, 65), 0.00008, 0,
)
PEARL_PAINT = SurfaceFinish(
    'Fine automotive pearl roughness', (0.235, 0.255), (1100, 1100, 1100), 0, 0.18,
)


# ============================================================
# Preserve authored maps while adding a portable studio finish
# ============================================================

def find_principled_shader(material):
    if not material or not material.use_nodes:
        return None
    return next((node for node in material.node_tree.nodes
                 if node.type == 'BSDF_PRINCIPLED'), None)


def set_unmapped_input(shader, name, value):
    socket = shader.inputs.get(name)
    if socket is not None and not socket.is_linked:
        socket.default_value = value


def create_finish_node(nodes, node_type, label, position):
    node = nodes.new(node_type)
    node.label = label
    node.name = f'CABEK finish | {label}'
    node.location = position
    return node


def add_surface_variation(material, shader, finish):
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    coordinates = create_finish_node(nodes, 'ShaderNodeTexCoord', 'Metre object coordinates', (-900, -450))
    mapping = create_finish_node(nodes, 'ShaderNodeVectorMath', 'Physical grain spacing', (-700, -450))
    mapping.operation = 'MULTIPLY'
    mapping.inputs[1].default_value = finish.texture_scale
    links.new(coordinates.outputs['Object'], mapping.inputs[0])
    noise = create_finish_node(nodes, 'ShaderNodeTexNoise', finish.label, (-500, -450))
    noise.noise_dimensions = '3D'
    noise.inputs['Scale'].default_value = 1
    noise.inputs['Detail'].default_value = 2
    noise.inputs['Roughness'].default_value = 0.6
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])

    #
    # A narrow roughness range breaks perfect highlights without making clean equipment look dirty.
    #

    if not shader.inputs['Roughness'].is_linked:
        roughness = create_finish_node(nodes, 'ShaderNodeMapRange', 'Subtle roughness variation', (-260, -400))
        roughness.inputs['From Min'].default_value = 0
        roughness.inputs['From Max'].default_value = 1
        roughness.inputs['To Min'].default_value = finish.roughness_range[0]
        roughness.inputs['To Max'].default_value = finish.roughness_range[1]
        links.new(noise.outputs['Fac'], roughness.inputs['Value'])
        links.new(roughness.outputs['Result'], shader.inputs['Roughness'])
    if finish.bump_distance <= 0:
        return
    bump = create_finish_node(nodes, 'ShaderNodeBump', 'Microscopic surface relief', (-40, -600))
    bump.inputs['Strength'].default_value = 0.16
    bump.inputs['Distance'].default_value = finish.bump_distance
    links.new(noise.outputs['Fac'], bump.inputs['Height'])

    #
    # Existing normal maps feed the new bump node so imported surface detail stays intact.
    #

    normal_input = shader.inputs['Normal']
    if normal_input.is_linked:
        previous_normal = normal_input.links[0].from_socket
        links.new(previous_normal, bump.inputs['Normal'])
    links.new(bump.outputs['Normal'], normal_input)


def apply_surface_finish(material, finish):
    shader = find_principled_shader(material)
    if shader is None or material.get('cabek_surface_finish_version') == FINISH_VERSION:
        return False
    set_unmapped_input(shader, 'Metallic', finish.metallic)
    set_unmapped_input(shader, 'Roughness', sum(finish.roughness_range) / 2)
    set_unmapped_input(shader, 'Anisotropic IOR Level', finish.anisotropy)
    set_unmapped_input(shader, 'Coat Weight', 0)
    add_surface_variation(material, shader, finish)
    material['cabek_surface_finish'] = finish.label
    material['cabek_surface_finish_version'] = FINISH_VERSION
    return True


# ============================================================
# Select equipment surfaces by purpose and retain optical materials
# ============================================================

def collect_material_owners(objects):
    owners = {}
    for obj in objects:
        if obj.type != 'MESH':
            continue
        for slot in obj.material_slots:
            if slot.material:
                owners.setdefault(slot.material, set()).add(obj.name)
    return owners


def choose_equipment_finish(material, owner_names):
    name = material.name.lower()
    if 'studio floor' in name:
        return STUDIO_FLOOR
    if 'stainless drive deck' in name:
        return STAINLESS_DECK
    if 'machined edge' in name:
        return MACHINED_ALUMINIUM
    if 'aluminium shell' in name:
        return BRUSHED_ALUMINIUM
    if 'graphite' in name or 'powder coat' in name:
        return POWDER_COAT

    #
    # Console materials were exported without names, so their mesh ownership supplies intent.
    #

    if any(name.startswith('Console aluminium enclosure') for name in owner_names):
        return BRUSHED_ALUMINIUM
    if any(name.startswith('Console weighted foot') for name in owner_names):
        return POWDER_COAT
    return None


def refine_vehicle_material(material):
    shader = find_principled_shader(material)
    if shader is None or material.get('cabek_surface_finish_version') == FINISH_VERSION:
        return False
    name = material.name.lower()
    if 'pearl paint' in name:
        changed = apply_surface_finish(material, PEARL_PAINT)
        set_unmapped_input(shader, 'Coat Weight', 0.85)
        set_unmapped_input(shader, 'Coat Roughness', 0.11)
        return changed
    if name.startswith('glass_ext'):

        #
        # Neutral laminated glass lets the authored cabin read through a single dielectric coating.
        #

        set_unmapped_input(shader, 'Base Color', (0.34, 0.38, 0.39, 1))
        set_unmapped_input(shader, 'Metallic', 0)
        set_unmapped_input(shader, 'Roughness', 0.045)
        set_unmapped_input(shader, 'Transmission Weight', 0.86)
        set_unmapped_input(shader, 'IOR', 1.46)
        set_unmapped_input(shader, 'Coat Weight', 0.12)
        set_unmapped_input(shader, 'Coat Roughness', 0.08)
        material['cabek_surface_finish'] = 'Neutral smoke laminated glass'
        material['cabek_surface_finish_version'] = FINISH_VERSION
        return True
    return False


def apply_studio_surface_finishes(bay_objects, vehicle_objects):
    """Apply editable Blender finishes once and return the affected material names."""
    finished_materials = []
    for material, owner_names in collect_material_owners(bay_objects).items():
        finish = choose_equipment_finish(material, owner_names)
        if finish and apply_surface_finish(material, finish):
            finished_materials.append(material.name)
    for material in collect_material_owners(vehicle_objects):
        if refine_vehicle_material(material):
            finished_materials.append(material.name)
    return finished_materials
