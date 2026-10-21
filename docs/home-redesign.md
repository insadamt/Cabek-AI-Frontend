# Minimal home

The home fills the viewport with plain manila folders. Swipe, drag, arrow buttons, and keyboard arrows move between dossiers. A small arrow opens the selected dossier. The only permanent text is the navigation, brand, outlined “DOSSIERS” backdrop, folder reference, and position counter.

Removed car illustrations, exposed papers, vehicle details, slogans, search, filters, statistics, help controls, and the footer from the home. The existing dossier list remains accessible from navigation.

Folder selection is preserved in the `slide` URL parameter without adding a history entry for every movement. Carousel arrows move across API pages and wrap at the collection boundaries.

## Manual test checklist

- [ ] Check that the home fills the screen without scrolling on desktop and mobile.
- [ ] Swipe or drag between folders and check the rotation.
- [ ] Open a dossier and return with Back.
- [ ] Review the plain folder shape and minimal reference label.

## Suggested commit

`fix(home): simplify to fullscreen plain folder carousel`
