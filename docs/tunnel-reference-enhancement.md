# Reference tunnel, lighting and materials

This report explains the scanner's reference-image refinement, the editable
Blender output and how to review the result. It depends on the procedural
Three.js tunnel, supplied studio-v2 sedan, local GLTF exporter and Blender 5.2
with Cycles. The reference guides the equipment's construction and finish;
the homepage retains category selection and vehicle motion. Its parked camera
moves slightly closer to suit the lower, more credible equipment proportions.

## Delivered changes

- The realism pass lowers the crown from about 3.04 m to 2.69 m and gives the
  horizontal portal beams the same structural depth as the columns.
- Graphite is now a dielectric powder coat, separated from metallic aluminium
  and stainless steel. Filtered procedural grain adds restrained roughness and
  microscopic relief without image downloads or extra draw calls.
- Assembly seams, folded edge beads, gasket joints, crown plates, socket screws,
  foundation washers and hex heads, rail end caps and cable-trunk covers explain
  how the equipment is assembled and serviced. Repeated hardware is instanced.
- Three graphite portals now have sharper chamfered shoulders, cast silver
  plinths, base anchors and recessed front-facing lime strips.
- The crown is open, with long silver perimeter members and structural portal
  beams. The previous six transverse louvers have been removed.
- Brighter brushed aluminium rails carry twenty compact optical cameras:
  sixteen side cameras and four overhead cameras. Each has a silver housing,
  graphite faceplate, layered inset optics, metallic retaining ring and ready light.
  Countersunk fasteners, cooling slots and protected signal leads add real camera detail.
  Short operator-side rail sections leave the car's doors and wheels visible.
- The drive deck uses anisotropic stainless steel, fine panel joints, perimeter
  trim and recessed drainage grates. The surrounding studio floor stays matte.
- The frontend captures a neutral reflection studio with rectangular light cards
  and dark contrast flags into one PMREM map. The temporary capture resources
  are disposed immediately. One shadowed key light and on-demand rendering remain.
  Narrower reflection sources, reduced flat fill and smaller shadow bias restore
  highlight contrast and tyre/deck contact. The console now has dark anti-reflective
  glass, emitted display pixels, a sealed enclosure and a heavier service pedestal.
- Diffuser surface colours follow category lighting so white studio light retains
  the lime accents. Camera, sensor and roof visibility settings remain synchronized
  with the physical console. Overhead cameras remain children of the canopy.

Camera geometry lives in `src/components/scanner/baySensors.ts`, assembly hardware
in `bayHardware.ts`, and surface shaders in `baySurfaceFinish.ts`, separately from
architecture. Repeated camera parts share instance buffers; the drainage slots
use one instanced draw. Resource cleanup includes these buffers and shared
geometry/materials. All changed source files remain below 500 lines.

## Blender deliverables

- Editable scene: `assets/blender/cabek-studio-v2/cabek-studio.blend`.
- Updated preview: `assets/blender/cabek-studio-v2/reference-study.png`.
- Reusable equipment: `public/models/studio-v2/cabek-tunnel.glb`.
- Camera-bounds report: `assets/blender/cabek-studio-v2/framing-report.json`.

The saved Blender composition contains the updated runtime equipment, supplied
sedan, packed vehicle textures and four review cameras. Five rectangular
softboxes provide broad top, side and end reflections. Blender's world fill,
softbox power and exposure are balanced to retain dark graphite and silver detail.
The Blender studio also packs the CC0 studio environment bundled with Blender
(Greg Zaal / Poly Haven). Its editable material nodes add fine coating and machining
grain while preserving the vehicle's authored images and normal maps.

Reproduce from the project root:

```sh
node scripts/scanner/export_runtime_qa.mjs
CABEK_REVIEW_POSE=reference-study ALSOFT_DRIVERS=null blender --background --factory-startup --python-exit-code 1 -t 4 --python scripts/scanner/render_runtime_qa.py
```

The final preview is a bounded 1280×854, 48-sample Cycles render from an additional
lower reference-study camera. This camera is active in the saved Blender file.
The default command still renders at most three review poses; the reference
camera renders only when explicitly selected. The other checks use 24 samples.
Existing desktop/arrival/portrait
PNGs are earlier snapshots; their camera bounds are recalculated for the new
geometry. The homepage's asymmetric camera reserves space for workflow panels.
Blender lighting approximates the browser's reflection map and physical lights.
The standalone GLB retains portable scalar PBR properties and finish metadata;
procedural grain is supplied by the frontend shader or restored by
`scripts/scanner/studio_surface_finish.py` in Blender.

## Verification

- `npm test`: 355 tests pass across 40 files.
- `npm run build`: TypeScript and production build pass. The existing 500 kB
  Vite chunk advisory remains.
- Geometry checks verify twenty cameras, safe side/overhead vehicle clearance,
  canopy parenting, settings synchronization and exactly-once resource cleanup.
- All twelve expanded surface-shader programs compile and link with
  `glslangValidator`: three finishes with standard, instanced, mapped/double-sided
  and physical/anisotropic variants. Browser GPU appearance remains a manual check.
- Existing projection checks verify desktop/phone composition and selector
  clearance with the updated equipment bounds.
- Blender imports the exported equipment and car, renders the reference composition
  and saves the editable scene. All four review poses fit their camera frusta.
- No Playwright, browser automation or browser GPU screenshot was used.

## Manual test checklist

- [ ] Open `/`, complete or skip the introduction and compare the graphite
  portals, silver rails, open crown and lime strips with the supplied reference.
- [ ] Orbit around the equipment. Inspect lens rings, camera housings, plinths,
  anchors, joint seams, service covers, drainage channels, steel grain/reflections
  and the dark physical console. Check grain stays stable when zooming out.
- [ ] Check the car clears the portals and cameras throughout its entrance;
  confirm grounded tyres and rolling wheels.
- [ ] Select all three categories. Check visible light changes, readable strip
  colours, a stationary parked car and the matching dossier destinations.
- [ ] Check bright white paint and metal retain detail without glare on the
  target browser/GPU. Check dark glass and graphite remain distinct.
- [ ] Check desktop, 320px/390px phones and short landscape: equipment fits,
  workflow panels stay clear, and orbit/zoom/reset remain usable.
- [ ] Check reduced motion, hide/restore, navigation away and retry after a
  failed model request; verify a coherent scene and no idle animation loop.
- [ ] Open the saved `.blend`, inspect its packed car textures and camera
  collections, and adjust the five named softboxes if making another render.

## Commit message suggestions

- `feat(scanner): match reference tunnel with optical cameras and brushed steel`
- `feat(studio): refine neutral lighting and export editable Blender tunnel`
- `feat(scanner): add manufactured surface finishes and serviceable hardware`
