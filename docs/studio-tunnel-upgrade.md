# Supplied sedan and sensor tunnel

This report explains the supplied car's Blender export, the completed sensor
tunnel and its frontend controls, so the editable studio and live scene can be
reviewed and reproduced together. It depends on Three.js, GSAP, the local Draco
decoder, Blender 5 and the user's original `model.blend` input.

This is the preceding asset-upgrade report. The current homepage camera, roof
refinement, controls and verification are described in
[premium-homepage-polish.md](premium-homepage-polish.md). Saved Blender renders
remain historical snapshots, and the former visual-settings panel is not shown
in the current minimal homepage toolbar. The runtime retains its settings API.

## Delivered scene

The homepage now loads `public/models/studio-v2/cabek-vehicle.glb` instead of the
Ferrari. The supplied sedan retains its geometry, interior, smooth normals and
PBR maps. Its original 124 meshes / 112,576 source polygons are evaluated and
batched into five exported meshes: the body and four independently rolling
wheel assemblies. This batching retains multiple material groups and does not
imply only five draw calls.

The export normalizes the vehicle to 4.8 metres long, facing negative glTF Z,
with its tyres on the drive surface. Each named wheel pivot records the measured
0.3392309 metre tyre radius. Frontend wheel rotation derives from distance
travelled and this radius, so repeated renders never accumulate rotation.

Unsupported source paint nodes become portable pearl clearcoat; glazing is tuned
for glTF transmission. Other authored surfaces retain their material properties
and maps. Texture dimensions are capped at 1024 pixels and embedded as JPEG at
quality 90 where alpha is unnecessary. With Draco mesh compression, the vehicle
is 2,373,428 bytes, down from the first 11,710,752 byte export. The original
`/home/insayd/Desktop/3D/model.blend` is read without modification.

The tunnel now has graphite chamfered portals, satin aluminium side panels and
roof edges, twelve overhead louvers, recessed diffusers and twenty thin sensor
windows. Rectangular dark windows and narrow status bars replace projecting
camera bodies, cylindrical barrels and lens rings. Four sensors sit under the
canopy; they disappear with the roof when its visibility is disabled.

A physical pedestal carries a mesh-based control screen. Its text, illumination
bar and switch indicators are actual geometry, so they remain available in the
editable Blender scene without generated image textures or DOM dependencies.

## Frontend behavior

The existing first-selection entrance and camera movement remain. Once parked,
switching between the three categories changes physical category lighting without
moving/reloading the vehicle. Direct category URLs initialize the parked view.
Portrait camera framing includes the finished canopy and the operator pedestal.

The **Réglages du tunnel** panel provides keyboard-accessible controls:

- **Éclairage** adjusts category illumination from 15% to 100% (default 75%).
- **Capteurs visibles** toggles sensor windows and their status bars.
- **Toiture visible** toggles the roof panels, louvers and attached roof sensors.

The physical screen mirrors these settings. They control the 3D presentation;
they do not operate scanner hardware or submit scan requests. Settings survive
category changes and a scene retry, and reset when the stage is unmounted.
Controls are disabled until the model is ready and during a scene failure.

Rendering remains on demand. Settings request a frame and invalidate shadows;
they do not create a continuous idle loop. Hidden/offscreen scenes pause, model
loading is cancellable, and disposal releases shared geometry, materials,
textures, sensor instances, the console and renderer resources exactly once.

## Editable assets and reproduction

- Native composition: `assets/blender/cabek-studio-v2/cabek-studio.blend`.
- Review images: `desktop-arrival.png`, `desktop-parked.png`, `portrait-parked.png`
  in that directory, with `framing-report.json`.
- Supplied car: `public/models/studio-v2/cabek-vehicle.glb` and its export manifest.
- Reusable tunnel: `public/models/studio-v2/cabek-tunnel.glb`, without the large
  presentation floor. The frontend builds the same tunnel procedurally.

Run from the project root:

```sh
ALSOFT_DRIVERS=null blender --background --factory-startup -t 4 --python-expr "import runpy,sys;sys.path.insert(0,'scripts/blender_mcp');runpy.run_path('scripts/blender_mcp/export_user_vehicle.py',run_name='__main__')"
node scripts/scanner/export_runtime_qa.mjs
ALSOFT_DRIVERS=null blender -b -setaudio None -t 4 --python scripts/scanner/render_runtime_qa.py
```

The export script needs the supplied source at its documented path. The saved
studio and frontend GLBs are self-contained after generation. The studio retains
three exact frontend camera endpoints and 23 packed images, with no external
image files required. Existing Blender scenes remain available in the live
session; the new composition is selected for inspection.

Source ownership/license details are recorded in
[model provenance](../public/models/LICENSES.md). No original author/license was
provided with the supplied sedan; the previous Ferrari attribution does not
describe the new car.

## Verification report

- `npm test`: **316 tests pass across 37 files**.
- `npm run build`: TypeScript and production Vite build pass. Vite retains the
  500 kB advisory: application 513.90 kB, lazy 3D runtime 688.00 kB, uncompressed.
- Focused checks cover PBR retention, wheel radius, cancellation, shared resource
  cleanup, complete camera framing, controls, roof-attached sensors, synchronized
  screen indicators, hidden rendering and scene retry.
- Prettier passes for the touched frontend/QA JavaScript files;
  `git diff --check` passes. New source/test files remain under 500 lines.
- The existing local Vite server returns HTTP 200 for `/`, the new vehicle and
  the runtime module. The vehicle is served as `model/gltf-binary`.
- Three bounded 12-sample Blender renders verify arrival and parked desktop
  views plus parked portrait. All vehicle/equipment bounds fit those cameras.
- The saved Blender composition reopens successfully with packed textures.

No Playwright or browser automation was used. Offline previews use the actual
runtime meshes and cameras with approximate Cycles studio lighting; browser GPU
appearance, interactive controls and device performance require manual review.

## Manual test checklist

- [ ] Open `/` and select a category: verify the supplied sedan enters once,
  clears all portal/sensor/roof surfaces and rolls its wheels without sliding.
- [ ] Inspect the pearl paint, transparent glazing, interior and wheel surfaces
  at desktop size; confirm the old Ferrari is absent.
- [ ] Inspect the twelve roof louvers and flush rectangular sensor windows.
- [ ] Open **Réglages du tunnel** with mouse and keyboard. Adjust illumination
  through its range; verify the tunnel lights and physical screen bar respond.
- [ ] Toggle sensors and roof independently. Verify overhead sensors never float
  when the roof is hidden and the physical screen indicators match the controls.
- [ ] Switch all categories during/after entrance; verify one entrance, stable
  visual settings and the latest lighting palette.
- [ ] Check direct category URLs, collection navigation and browser Back.
- [ ] Check 320px/390px phones, tablet, desktop, short landscape and 200% zoom;
  verify the scene, settings panel and category dock remain usable.
- [ ] Enable reduced motion, hide/restore the tab and navigate away during
  model loading; verify coherent poses and no idle rendering loop.
- [ ] Fail the model request or lose WebGL context, retry and verify settings
  are retained while dossier navigation remains available.
- [ ] Open the saved Blender file and inspect the supplied car, completed roof,
  recessed sensors, console and three saved camera endpoints.

## Suggested commit messages

- `feat(scanner): integrate supplied sedan and completed sensor tunnel`
- `feat(studio): add synchronized lighting and tunnel visibility controls`
- `chore(blender): export editable studio and bounded composition previews`
