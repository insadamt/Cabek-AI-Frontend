# CABEK cinematic category assets

The active category screen uses the live Three.js scene documented in
[`docs/category-stage.md`](../../docs/category-stage.md). The films below are
retained from the earlier experiment and are not requested by the active screen.

These local films and posters illustrate the three category choices without a
runtime 3D viewer. They depend on the rendering scripts in `scripts/cinematic`
and the vehicle/scanner sources documented in `public/models/LICENSES.md`.

- `expertise.mp4` / `expertise.webp`: vehicle entering the CABEK scanner.
- `quick.mp4` / `quick.webp`: representative photographs and an unfilled estimate.
- `verification.mp4` / `verification.webp`: representative before/after photographs.
- `vehicle-photograph.png`: shared studio photograph used inside the photo mounts.

The films are silent H.264, 16:10, served locally, and designed to play once after
selection. Matching WebP posters show the final pose for reduced motion and
playback fallbacks. The background is composited over `#fafafa` with real shadows.

Vehicle attribution: Ferrari 458 Italia by **vicent091036**, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), originally published on
[Sketchfab](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6).
The source distribution is the pinned Three.js `r180` example model. These
derivative renders change the paint to petrol, adjust glass/alloy materials,
add studio lighting, and animate placement/wheel rotation. The original model's
geometry is retained. CABEK has no affiliation with the manufacturer.

The CABEK tunnel architecture and category scene compositions are project-owned.
The illustrations do not display real analysis results, damage valuations, or
claims of repair verification. Category navigation starts the actual workflow.
