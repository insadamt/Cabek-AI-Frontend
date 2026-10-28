# CABEK scanner model source

This directory contains the reproducible Blender source for the category page's
custom scan tunnel. It keeps the equipment grounded in CABEK's industrial scan
workflow while matching the app's graphite, white and lime materials. Generation
depends on Blender 5 and its bundled Python; no Python packages are required.

Run from the repository root:

```sh
blender --background --python scripts/scanner/build_scanner.py
```

The generated asset is `public/models/cabek-scanner.glb`. It contains geometry and
PBR materials, with no external textures, scene cameras or lights. Blender's
native glTF importer decodes its Draco mesh compression for the offline
[category film renderer](../cinematic/README.md). The converted fascia text
travels with the GLB, so rendered footage needs no separate font asset.

## Coordinates and integration

- Units: metres; glTF Y is up and floor Y is zero.
- Front: positive Z; a car drives through toward negative Z.
- Deck extent: Z -3.25 to +3.25; deck driving surface Y 0.096.
- Overall extent: X -2.126 to +2.353, Y 0 to 3.725, Z -3.25 to +3.25.
- Optical clearance: approximately 3.4 wide by 3.0 high above the driving deck.
- `CabekScanner` is the common root. Meshes are merged by purpose and material,
  retaining separate white, front lime, floor lime and camera status light meshes.
- `Light_White` and `Light_Lime` use emissive PBR materials. These materials can be
  dimmed independently during the approach and inspection demonstration.

The open frame deliberately leaves the car visible from a front three-quarter
camera. Seven illuminated ribs and twenty camera pods describe the real scan
equipment without adding opaque walls or a detailed marketing backdrop.

## Manual model checklist

- [ ] Open the category stage and inspect the entrance wordmark at normal zoom.
- [ ] Check the car clears the portal, camera pods and deck throughout its travel.
- [ ] Inspect white strips, lime inlays and optical lenses in the rendered footage.
- [ ] Check front three-quarter and mobile camera crops for structural clipping.
- [ ] Confirm changing emissive materials does not recolor the graphite frame.

Suggested commit: `feat(home): add custom CABEK scanner model and selection stage`
