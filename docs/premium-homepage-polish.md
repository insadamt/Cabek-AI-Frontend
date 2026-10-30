# Premium homepage polish

This report explains the homepage refinement, its verification and the remaining
manual acceptance checks. It depends on the existing HomeFrame, dossier routes,
Three.js/GSAP scanner runtime, supplied studio-v2 sedan and local Draco decoder.
The implementation preserves the supplied car and procedural tunnel architecture.

The subsequent reference-based tunnel, camera pods, materials and Blender lighting
are documented in [tunnel-reference-enhancement.md](tunnel-reference-enhancement.md).
The equipment descriptions below record this earlier polish pass.
The current playback, zoomed left composition and immediate category access are documented
in [scanner-playback-fix.md](scanner-playback-fix.md); the earlier 65–75% framing
measurements below describe the previous camera.

## Delivered behavior

- A closer, lower elevated three-quarter camera makes the car and scanner the
  main composition. Camera position, target, field of view and asymmetric
  projection reserve the right side; the model scale stays unchanged.
- Three separate panels sit vertically on the right: **Forfait / Devis
  d’expertise**, **Chiffrage rapide**, **Photos avant / après**. Small 01–03
  indices, readable labels, a restrained lime selection edge and smooth surface
  transitions replace the rounded enclosing dock. **Ouvrir les dossiers ↗**
  remains beneath them and follows the selected collection.
- A continuous close POV, upward/backward reveal, rolling vehicle entry and
  final left composition precede the vertical GSAP panel stagger. Camera input
  transfers ownership before OrbitControls receives it; the car keeps its
  existing trajectory. Skip, direct category URLs and reduced motion settle
  coherently without reconstructing the scene.
- Drag/pinch/wheel exploration remains available. Canvas arrow keys orbit,
  `+` / `−` zoom and Home resets. Reset clears residual damping and follows a
  shortest spherical arc around the equipment instead of crossing through it.
  Camera transitions remain interruptible and preserve manual views on resize.
- Slimmer existing roof members leave the vehicle more visible. Graphite,
  brushed aluminium, recessed sensor optics, console hinge/anchors and controlled
  lime diffusers improve the equipment without rebuilding its industrial form.
- Authored vehicle maps/interior remain. Pearl clearcoat, glazing, tyres and
  alloy highlights are moderated. Opaque body surfaces retain shadows even
  when the batched vehicle also contains transparent glass. Soft studio lighting,
  tighter shadow coverage and matte flooring improve depth without bloom.
- The near-white environment, black frame and compact black island remain.
  The reset action is discreet; redundant captions, icons and visible camera
  helper copy have been removed. Accessible interaction guidance remains.

## Verification

| Check | Result |
| ----- | ------ |
| `npm test` | 355 tests pass across 40 files |
| `npm run build` | TypeScript and production Vite build pass |
| `git diff --check` | Pass |
| Changed frontend file lengths | Below 500 lines each |
| Browser automation / Playwright | Not run |

The composition suite projects the actual procedural equipment mesh bounds and
conservative metre-scaled vehicle bounds through the real Three.js camera.
At **1920×1080, 1440×900 and 1280×800**, the parked structure occupies **65–75%**
of the viewport height, clears the island and stays outside the workflow panels.
Additional checks cover 1024×768, 700×500 landscape, 760×900, 650×600,
390×690, 320×690 and 390×480. These protect framing and control clearance;
they do not establish browser-rendered material appearance.

Regression coverage verifies cinematic phase ordering, one entrance/completion,
independent light transitions, hidden/offscreen suspension, reduced motion,
manual camera handoff, bounded zoom, keyboard controls, opposite-side reset
clearance, resize during reset, deferred loading, context loss and disposal.
Existing dossier, capture, analysis, folder and route tests continue to pass.

Rendering remains on demand, with bounded pixel ratio, one shadow map and no
post-processing pipeline. No dependencies were added for this refinement. Vite
retains its existing 500 kB chunk advisory: application **513.07 kB** and lazy
3D runtime **717.45 kB** uncompressed (**172.12 / 193.72 kB** gzip).

No browser GPU session, costly offline render or device frame-rate measurement
was performed. Earlier Blender renders and exported tunnel snapshots describe
the preceding upgrade; they are not screenshots of this polished homepage.
The current runtime mesh/projection tests are the verification source.

## Manual test checklist

- [ ] Reload `/` with normal motion. Check close POV → upward/backward reveal → rolling drive → parked left composition → staggered vertical panels, with no cut or camera jump.
- [ ] At 1920×1080, 1440×900 and 1280×800, confirm the scanner dominates the scene, all equipment fits and the right panels remain clear.
- [ ] Inspect pearl paint, glazing/interior, tyres, alloy reflections, soft contact shadows and white-surface exposure on the target browser/GPU.
- [ ] Inspect the partially open roof, recessed sensors and external terminal hinge/base from several orbit angles; confirm no floating parts or excessive lime spill.
- [ ] Select all three exact labels with mouse and keyboard. Check restrained selection, smooth lighting, a stationary parked car and the matching dossier destination.
- [ ] Open every collection, then return with Accueil/browser Back. Reload valid and invalid `?parcours=` URLs; confirm context and intro behavior.
- [ ] Orbit, pinch/wheel zoom and reset from several sides. Check useful limits, tunnel clearance and smooth reset; interrupt reset with a new drag or zoom.
- [ ] Focus the canvas and use arrows, `+` / `−`, Shift+arrows and Home. Confirm visible focus, bounded movement and no page scrolling from handled keys.
- [ ] Interrupt the opening sequence with pointer/touch input; check the same camera takes over smoothly while the car continues its drive. Check the skip action separately.
- [ ] Resize while entering, resetting and manually orbiting. Check 1024×768, 700×500, 650×600, 320px/390px phones, short portrait, safe areas and 200% zoom.
- [ ] Enable reduced motion before load and during intro, palette changes and reset; confirm immediate coherent states and usable workflow panels.
- [ ] Hide/restore the tab mid-intro and after orbiting. Confirm pause/resume and no persistent animation work while settled.
- [ ] Fail model loading or lose the WebGL context. Confirm dossier navigation stays reachable, retry succeeds and navigation away during loading cleans up safely.

## Commit message suggestions

- `feat(home): polish cinematic automotive studio and vertical category selector`
- `feat(studio): refine homepage framing, materials and camera interaction`
