# CABEK inspection tunnel

The editable Blender scene is the source for the scanner shown on the category stage. It depends on Blender 5.2 with the glTF/Draco exporter. The frontend loads the exported tunnel and the existing studio-v2 sedan independently.

## Edit, export and review

Open `assets/blender/cabek-studio-v3/cabek-studio.blend` to edit the installation. From the repository root, export the saved edits and render the three review views with these commands.

```sh
blender -b assets/blender/cabek-studio-v3/cabek-studio.blend --python-exit-code 1 --python scripts/scanner/studio_v3/export_tunnel.py
blender -b assets/blender/cabek-studio-v3/cabek-studio.blend -t 6 --python-exit-code 1 --python scripts/scanner/studio_v3/render_reviews.py
```

The export writes `public/models/studio-v3/cabek-tunnel.glb`. The Cycles stills are saved beside the source as `exterior.png`, `inspection.png` and `service.png`. To reconstruct the original geometry from the photo study, use the following command in a clean checkout. It rewrites both the scene and export.

```sh
blender -b --factory-startup --python-exit-code 1 --python scripts/scanner/studio_v3/build_tunnel.py
```

## Scene and runtime contract

Blender uses metres and Z up, with the entrance on the negative Y end. glTF uses Y up, the entrance is at positive Z, and the floor is at zero. The root `CABEK_TUNNEL` has nine collections and corresponding named parent objects for export.

| Collection | Contents and control |
| --- | --- |
| STRUCTURE | Three portal frames, spliced longitudinal ties, fasteners and casters |
| EXTERIOR_PANELS | Graphite side sheets on the three separated modules |
| ROOF | Folded angular canopy sections and inner reflectors |
| FLOOR | A seamless studio slab representing the continuous workshop floor |
| INSPECTION_LIGHTS | A/B fixture banks at each module, with split vertical bars, shoulder bars and split overhead bars |
| RGB_LIGHTS | Four short diffusers with local housings, wired as one exterior analog zone |
| CAMERAS | Individually named bullet camera assemblies and articulated brackets |
| TECHNICAL_EQUIPMENT | Closed entrance cabinet with the original rack-style uprights, crossmembers and staggered slotted end panels around a horizontally centered, outward-facing touchscreen |
| BRANDING | Two outward-facing decals using the supplied CABEK AI artwork |

Preserve the `light_group` custom property on the diffusers. All twelve `Inspection_01_A_vertical` through `Inspection_03_B_crown` meshes use `inspection.white`. The four `Exterior_RGB_Logo_L/R` and `Exterior_RGB_Entrance_L/R` diffusers share the `Exterior_RGB` material and the `exterior.rgb` light group. Canopy-mounted luminaires and channels have `canopy_mount=true`, so the roof switch hides them together. Review cameras and area lights sit outside the exported root.

The shared loader fetches both GLBs with cancellation and the local Draco decoder. The retained runtime waits for both, compiles their shaders, then reports the first rendered frame. A failed load follows the existing retry path. The side decals, touchscreen splash and camera badges share one packed logo texture with smooth alpha, trilinear mipmaps and runtime anisotropic filtering. Fixed parts are batched by assembly. The export has 65 meshes, 91,206 triangles, 16 materials and no external textures. The scanner uses the existing reflection environment and one shadow-casting light.

## Capture and lighting

The visual settings control inspection brightness, standby RGB tint, RGB brightness, roof visibility and camera visibility. They change the loaded scene without hardware traffic. One RGB command changes all four exterior fixtures together.

| Confirmed capture state | Exterior visualization |
| --- | --- |
| Standby | White by default, with optional operator preview tint |
| Capturing | Red throughout capture, with a separate green sweep traveling along the vehicle |
| Completed | Smooth transition to green, ten-second hold from confirmation, then a fade to white |
| Failed | Smooth transition to amber, held until the state changes |

The capture store dates the first confirmed completion of an observed attempt, including a new admission that finishes before the first poll. The API exposes no completion timestamp, so the ten-second hold begins at confirmation by the client. Polls and route changes preserve the deadline. Reopening an old completed dossier starts in white. Reduced motion keeps a static green capture frame and steady colors. The scheduler sleeps once motion and fades settle.

Manual hardware tests on the settings page already use the trusted CABEK AI settings proxy. It forwards supported effects and parameters to `POST /api/lights/set` and sends bodyless `POST /api/lights/off`. CABEK AI owns physical capture transitions even when the browser is closed. The sibling backend currently requests a repeating red pulse during capture. Matching the solid-red visualization on the physical strip requires a change to that backend preset.

## Reference and dimensional assumptions

The study used all five workshop images: side elevation (20261109_123912), occupied entrance (20261109_135408), panel lettering (20261113_141110), open rack (20261114_164614) and empty inspection lane (IMG-20261107-WA0000). The originals remain outside the repository.

Scale is estimated from the vehicle and the openings. Module centres are spaced 2.52 m apart, their sheet sections are 1.38 m deep, and the nominal crown height is 2.85 m. The photographed floor runs through the installation. Its workshop color bands, background, loose cables, ladder and temporary desk are omitted from the studio. The finished cabinet and the supplied **CABEK AI** logo follow the updated design. Keep `cabek-ai-logo.png` beside the editable scene when rebuilding it from Python.

The six inspection rings are numbered from the vehicle entrance. Rings 1, 3, 4 and 6 carry one low, inward-facing bullet camera on each side. The rounded white shells, black optical faces and swivel mounts follow the supplied camera photo and carry CABEK AI badges. Housing dimensions and lens angles are estimates. No overhead cameras were added. The reference informed two estimated RGB lengths. The bars above the side logos run 0.90 m horizontally. Each entrance post carries a 1.32 m vertical bar. The screen center is 1.365 m above the floor. Touchscreen dimensions, fastener sizes, panel gauges and caster diameters are estimates. Adjust the saved assemblies when measured dimensions become available.

Both shipped GLBs were decoded together in Blender. The grounded sedan measures approximately 2.03 m wide, 4.80 m long and 1.44 m tall. A conservative swept body box along the 7.2 m entrance path clears the side equipment by at least 0.70 m and the overhead fixtures by 1.22 m. These are model clearances.

The saved scene reopened in Blender 5.2.3. Chrome with software WebGL loaded both production GLBs on the category route. Orbit, reset, visibility switches, vehicle entry and the three simulated status colors were exercised. The timed entrance completed in a small viewport; software rendering exceeded the 40-second check at the larger review size. Measure frame timing on a CABEK PC. The frontend suite and production build passed. Hardware delivery and measured installation dimensions require an on-site check.

## Historical assets

The studio-v1 and studio-v2 files remain earlier studies. `build_scanner.py` and `render_preview.py` belong to the original scanner and cinematic assets. The historical [cinematic workflow](../cinematic/README.md) describes those outputs.
