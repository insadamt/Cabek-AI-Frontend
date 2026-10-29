# Premium 3D category stage

This guide explains the homepage's continuous 3D introduction, workflow selection
and camera interaction so the scene can be maintained without changing dossier
behavior. It depends on HomeFrame/activity island, Three.js, GSAP, local Draco
mesh decoding and the supplied sedan GLB. Current verification and acceptance
checks are recorded in [premium-homepage-polish.md](premium-homepage-polish.md).
The supplied model export and editable studio are documented in
[studio-tunnel-upgrade.md](studio-tunnel-upgrade.md).

## Scene and introduction

One persistent WebGL canvas contains the supplied sedan and existing scanning
bay. Metre-scaled graphite frames, satin aluminium details, partially open roof,
recessed sensor windows, illuminated diffusers and the external control pedestal
retain the tunnel's industrial identity. The car preserves its detailed geometry,
interior and four independently rolling wheel assemblies.

Bare `/` starts the introduction automatically once the vehicle loads:

1. A close perspective view frames the approach car.
2. The camera retreats upward and backward to reveal the tunnel in three quarters.
3. The car drives into the stationary tunnel; wheel rotation follows travel distance.
4. After the car parks, the camera moves closer and composes the equipment to the left.
5. Three numbered category panels enter vertically on the right with a staggered reveal.

The same camera, vehicle and canvas remain throughout. The final elevated
three-quarter view exposes the vehicle's front, side, wheels and roof. Camera
position, target, field of view and projection reserve room for the selector;
model scale remains physical. The near-white studio, thin black application
border and compact black CABEK AI island remain in place.

A valid `?parcours=` URL initializes the selected category with the car parked.
Reduced motion also settles the introduction and panel reveal immediately.
**Passer l’introduction** reaches the final composition without reloading the scene.

## Workflow panels and navigation

Exactly three separate panels display small indices and the complete labels:

| Index | Category                    | Physical illumination                  |
| ----- | --------------------------- | -------------------------------------- |
| 01    | Forfait / Devis d’expertise | Restrained lime with pale green fill   |
| 02    | Chiffrage rapide            | Muted lime with more focused lighting  |
| 03    | Photos avant / après        | Soft white with stronger sensor detail |

The selected panel uses a restrained lime edge and surface. Inactive panels stay
understated, with readable single-line labels and visible hover/focus feedback.
**Ouvrir les dossiers ↗** sits beneath the panels and opens the selected collection
immediately. Category selection updates the URL without adding a history entry.
Browser Back and the collection's Accueil action retain category context.

Selecting a category reuses the loaded meshes, changes the light palette and
emphasis, and can make a small camera adjustment while the view is unmodified.
A manually explored view remains under the user's control. Selection never
replays the vehicle entrance or submits a scan, upload or creation request.

The tablist supports arrow keys, Home and End with one active tab stop. On phones,
the same three panels stack below the scene; short landscape viewports use the
compact right-hand layout. No separate studio caption or redundant selector
heading competes with the equipment.

## Camera interaction

Drag the canvas to orbit; use the wheel or touch pinch to zoom. With the canvas
focused, arrow keys orbit, `+` / `−` zoom and Home restores the composed view.
**Réinitialiser la vue** provides the same discreet reset action. Camera movement
uses damping, bounded distance/elevation and structural clearance checks.

Manual input cancels an active camera transition before taking ownership of the
same camera. If input occurs during the introduction, the vehicle continues its
existing drive without teleporting. Reset and category transitions remain
interruptible; hidden-tab and reduced-motion changes settle or pause their owner.
The canvas retains an accessible interaction description without visible helper
copy across the studio.

## Rendering and lifecycle

`CategoryStageVisual` lazily loads the scene and exposes loading, retry, skip and
reset actions. `bayGeometry` owns tunnel architecture; `bayVehicle` loads and
prepares the GLB; `bayPresentation` defines camera poses and vehicle travel;
`bayChoreography` owns the introduction and independent illumination;
`bayCameraController` handles orbit and camera transitions. `bayRuntime` owns
loading cancellation, visibility, resize, context loss and on-demand frames.

The studio uses a prefiltered reflection environment, clearcoat pearl paint,
optical glazing, differentiated rubber/alloy materials, ACES tone mapping and
one soft shadowed key light. Category lights illuminate nearby surfaces alongside
the emissive scanner strips. Exposure, reflections and contact shadows are
balanced without bloom or a mirror floor.

Frames are requested during loading, choreography, resize and camera damping,
then stop when the scene settles. Hidden/offscreen scenes pause their timelines
and cancel queued frames. Pixel ratio is capped at 1.75 desktop / 1.35 narrow
screens, with one 2048px desktop / 1024px narrow shadow map. Category changes reuse
decoded assets and do not drive per-frame React state updates.

Leaving aborts network loading, guards late decoding, removes observers/listeners,
kills timelines and disposes geometry, materials, textures, reflection targets,
shadows and renderer resources. Reduced motion settles the latest requested
lighting and camera destination immediately.

If WebGL, model loading or the graphics context fails, the failure releases the
workflow panels and offers **Réessayer**. Dossier navigation remains available.
Retry reconstructs the real scene with the selected category parked.

## Assets and provenance

The active local model remains `public/models/studio-v2/cabek-vehicle.glb`, exported
from the user's supplied sedan. Its original author/license was not supplied;
see [model provenance](../public/models/LICENSES.md). Export adaptations include
portable paint/glazing, embedded texture compression, metre scaling and wheel
pivots. Geometry, smooth normals, interior and authored PBR maps are retained.
The earlier Ferrari remains only in historical assets and rendered derivatives.

Three.js 0.180.0 and the glTF Draco wrapper/WASM decoder are pinned locally. The
decoder's Apache 2.0 license accompanies its files. The runtime continues to use
mesh geometry rather than vehicle images, video or a flat substitute.

## Verification and manual review

See [premium-homepage-polish.md](premium-homepage-polish.md) for the current test,
production build and composition report. Historical test totals and older camera
renders do not describe the current homepage. No Playwright or browser automation
is used; browser GPU appearance, touch behavior and device frame rate require
manual review.

- [ ] Reload `/`; verify close POV, upward/backward reveal, rolling entry, parked left composition and vertical panel reveal form one continuous sequence.
- [ ] Inspect front, side, wheels, roof, recessed sensors and external terminal; verify the equipment dominates the desktop composition.
- [ ] Switch all three categories; verify exact labels, selected lime accent, physical light changes, stable parked car and correct dossier destinations.
- [ ] Drag, zoom, reset and use canvas arrow keys, `+` / `−` and Home; verify smooth movement, safe clearance and no camera jump on takeover.
- [ ] Interrupt the introduction with manual camera input; verify the car continues its existing drive. Test the skip action separately.
- [ ] Open a direct category URL and return from a collection with Accueil/browser Back; verify selected context and parked composition.
- [ ] Enable reduced motion before and during entry, lighting and camera transitions; verify immediate coherent states without replay.
- [ ] Hide/restore the tab mid-entry and after orbiting; verify pause/resume and no perpetual idle rendering.
- [ ] Fail model loading or lose WebGL context; verify retry and usable dossier navigation.
- [ ] Check 1920×1080, 1440×900, smaller desktops, 320px/390px phones, short landscape and 200% zoom for readable panels and reachable controls.
