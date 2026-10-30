# Premium 3D category stage

This guide explains the homepage's continuous 3D introduction, workflow selection
and camera interaction so the scene can be maintained without changing dossier
behavior. It depends on HomeFrame/activity island, Three.js, GSAP, local Draco
mesh decoding and the supplied sedan GLB. Current verification and acceptance
checks are recorded in [premium-homepage-polish.md](premium-homepage-polish.md).
The current preparation screen and coordinated Island/card/model arrival are
documented in [stage-entrance.md](stage-entrance.md). The playback and zoomed camera are documented in
[scanner-playback-fix.md](scanner-playback-fix.md); its framing supersedes the
earlier elevated homepage composition.
The loaded canvas, decoded model and GPU resources are retained between route
visits as described in [studio-cache.md](studio-cache.md).
The latest equipment, lighting and Blender outputs are documented in
[tunnel-reference-enhancement.md](tunnel-reference-enhancement.md).
The supplied model export and editable studio are documented in
[studio-tunnel-upgrade.md](studio-tunnel-upgrade.md).

## Scene and introduction

One persistent WebGL canvas contains the supplied sedan and existing scanning
bay. Metre-scaled graphite portals, brushed silver rails, an open perimeter roof,
compact optical cameras, lime diffusers and the external control pedestal
retain the tunnel's industrial identity. The car preserves its detailed geometry,
interior and four independently rolling wheel assemblies.

Fresh loads of `/` or `/preview/expertise`, including a selected-category URL,
starts the introduction automatically once the vehicle loads:

1. A preparation screen covers the scene until the model, shaders, first rendered
   frame, fonts and branding are ready. Unfinished controls are hidden and inert.
2. The loader fades and the Island pops into the frame, followed closely by the
   staggered category cards and the model rising directly in its left-side area.
3. After every interface element settles, the car starts its 2.2-second animation.
   Cards are already in place; camera controls become available on that same cue.

The same camera, vehicle and canvas remain throughout. The final enlarged, more frontal
three-quarter view matches the supplied screenshot, with the vehicle, open crown
and console on the left. Camera
position, target, field of view and projection reserve room for the selector;
model scale remains physical. The near-white studio, thin black application
border and compact black CABEK AI island remain in place.

A valid `?parcours=` URL preserves the selected category without skipping playback.
Reduced motion shows the complete interface and parked car as soon as preparation finishes.
**Passer l’introduction** reaches the final composition without reloading the scene.
Browser Back/Forward and internal returns restore the parked composition without
the Island/card/model entrance or a generic route slide. A ready cached runtime
is reattached without model reconstruction or a progress page; categories and the
Island are immediately usable. A deliberate refresh plays the introduction again.

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

`useStageEntrance` coordinates identity/scene readiness and the scoped CSS entrance.
`BayRuntimeCacheProvider` retains one loaded studio for the app's lifetime.
`CategoryStageVisual` attaches its canvas and exposes loading, retry, skip and
reset actions. `bayGeometry` owns tunnel architecture; `bayVehicle` loads and
prepares the GLB; `bayPresentation` defines camera poses and vehicle travel;
`bayChoreography` owns the introduction and independent illumination;
`bayCameraController` handles orbit and camera transitions. `bayRuntime` owns
loading cancellation, shader preparation, first-frame readiness, visibility,
resize, context loss and on-demand frames. Playback starts on the page reveal cue.

The studio uses a prefiltered rectangular-softbox reflection environment, clearcoat pearl paint,
optical glazing, differentiated rubber/alloy materials, ACES tone mapping and
one soft shadowed key light. Category lights illuminate nearby surfaces alongside
the emissive scanner strips. Exposure, reflections and contact shadows are
balanced without bloom. The steel deck has brushed reflections and the surrounding floor remains matte.

Frames are requested during loading, choreography, resize and camera damping,
then stop when the scene settles. Hidden/offscreen scenes pause their timelines
and cancel queued frames. Pixel ratio is capped at 1.75 desktop / 1.35 narrow
screens, with one 2048px desktop / 1024px narrow shadow map. Category changes reuse
decoded assets and do not drive per-frame React state updates.

Leaving parks the car and pauses the cached runtime without disposing its decoded
model or GPU resources. App teardown/retry aborts loading, guards late decoding,
removes listeners and disposes geometry, materials, textures, reflection targets,
shadows and renderer resources. Reduced motion settles lighting and camera motion.

If WebGL, model loading or the graphics context fails, the scene offers
**Réessayer** and releases the preparation screen so workflow navigation is available.
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

- [ ] Reload `/`; verify preparation → Island pop → cards/model entrance, then rolling entry in the left area with no delayed horizontal slide.
- [ ] Verify the larger view and car facing the screen more directly; inspect the front, side, wheels, open crown, sensors and external terminal without edge clipping.
- [ ] Switch all three categories; verify exact labels, selected lime accent, physical light changes, stable parked car and correct dossier destinations.
- [ ] Drag, zoom, reset and use canvas arrow keys, `+` / `−` and Home; verify smooth movement, safe clearance and no camera jump on takeover.
- [ ] Interrupt the introduction with manual camera input; verify the car continues its existing drive. Test the skip action separately.
- [ ] Reload a direct category URL and verify playback. Return from a collection with Accueil/browser Back and verify selected context with the car parked and no entrance replay.
- [ ] Enable reduced motion before and during entry, lighting and camera transitions; verify immediate coherent states without replay.
- [ ] Hide/restore the tab mid-entry and after orbiting; verify pause/resume and no perpetual idle rendering.
- [ ] Fail model loading or lose WebGL context; verify retry and usable dossier navigation.
- [ ] Check 1920×1080, 1440×900, smaller desktops, 320px/390px phones, short landscape and 200% zoom for readable panels and reachable controls.
