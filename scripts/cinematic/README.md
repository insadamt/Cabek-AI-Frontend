# CABEK category films

The current category stage uses a live Three.js vehicle and procedural scanning
bay. See [the current report](../../docs/category-stage.md).
The Blender workflow below reproduces the retained earlier film experiment.

These scripts render the category selector's fixed-camera films and reduced-motion
posters. They use Blender 5's Cycles renderer, the scanner/vehicle assets in
`public/models`, Python 3 with Pillow, and ffmpeg. Pre-rendering controls lighting
and composition without shipping a model viewer or requiring WebGL at runtime.

`scene_shared.py` owns the common petrol paint, graphite tunnel, white studio,
camera, and transparent shadow-catching floor. `render_categories.py` composes
each category and writes posters or numbered animation frames. `finish_assets.py`
composites frames onto the app's `#fafafa` stage and exports WebP/H.264 assets.

Render one poster first, review it, then render its film. Use four CPU threads
per Blender process. Default to sequential rendering; overlap categories only
after measuring memory use on the current development machine.

To regenerate the shared photograph before rendering category scenes:

```bash
ALSOFT_DRIVERS=null blender --background -setaudio None --threads 4 \
  --python scripts/cinematic/render_categories.py -- \
  --category quick --photograph --samples 8 --width 480 --height 300
python scripts/cinematic/finish_assets.py quick --photograph
```

The category poster and film commands are:

```bash
ALSOFT_DRIVERS=null blender --background -setaudio None --threads 4 \
  --python scripts/cinematic/render_categories.py -- \
  --category expertise --poster --samples 12
python scripts/cinematic/finish_assets.py expertise

ALSOFT_DRIVERS=null blender --background -setaudio None --threads 4 \
  --python scripts/cinematic/render_categories.py -- \
  --category expertise --samples 6 --width 960 --height 600
python scripts/cinematic/finish_assets.py expertise --film
```

Repeat with `quick` and `verification`. Each film uses 24 actual rendered poses
over a two-second selection action. ffmpeg motion interpolation encodes 48 frames
at 24 fps; inspect interpolated midpoints for ghosting before delivery. The film
uses no audio, plays once, and holds its final composition. Each matching WebP
poster uses the same final pose. Raw PNG frames are temporary files
in `/tmp/cabek-cinematic`; only finished films and posters belong in public assets.
The source animation timeline is fixed at 48 frames. Rendering intentionally
reuses existing selected poses, so clear `/tmp/cabek-cinematic/<category>` before
rendering again after changing a scene, camera, material, animation, resolution,
or sampling settings.

The photo-card texture is a studio rendering of the same car. The estimate sheet
has unfilled lines rather than an invented price. The before/after cards show
representative photography without depicting a fabricated AI inspection result.
These films illustrate category choice; they do not represent live processing.

The Ferrari model keeps its existing CC BY attribution in
`public/models/LICENSES.md`. The scanner and scene architecture are project-owned.

Manual visual checklist:

- [ ] Confirm petrol paint, dark scanner, lime detail, and white stage read clearly.
- [ ] Confirm the expertise vehicle moves into the scanner and remains visible.
- [ ] Confirm quick photographs and an unfilled estimate appear around the car.
- [ ] Confirm before/after mounts remain distinct and contain no AI scan effect.
- [ ] Confirm no car, card, or scanner edge is cropped at either end of each film.
- [ ] Confirm every film ends on the same pose as its matching poster.
