# Superseded scanner prototype

This note records why the original interactive scanner viewer was replaced and
where its reusable source lives. It depends on the current
[category-stage documentation](category-stage.md), the offline Blender source and
the retained model provenance in [LICENSES.md](../public/models/LICENSES.md).

The original orbitable WebGL prototype has been replaced by the cinematic
three-category selector. `/preview/expertise` now opens that selector, with the
same experience as `/`. Category selection plays the corresponding rendered
scene; the separate collection action opens its dossiers.

The custom tunnel remains reproducible through
[`build_scanner.py`](../scripts/scanner/build_scanner.py). The current films and
posters use the [offline cinematic rendering workflow](../scripts/cinematic/README.md).
The original `public/models/scanner-preview.webp` and its
[`render_preview.py`](../scripts/scanner/render_preview.py) source remain as
historical prototype artifacts.

Use [category-stage.md](category-stage.md) for the current behavior, validation
report and manual test checklist.
