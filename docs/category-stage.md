# Cinematic category selection

This document explains the category landing's pre-rendered films, selection
behavior, visual direction and acceptance checks. It depends on the existing
HomeFrame/activity island, shared category routes, GSAP and local video assets.

The screen has one large fixed composition and three compact category selectors.
Selecting a category changes the title, description, destination and animated
scene. The vehicle and equipment are rendered offline; the browser displays a
short muted film and ordinary accessible HTML controls.

## Art direction and scenes

All three scenes share a glossy petrol vehicle, graphite equipment, near-white
studio ground, clear reflections, soft shadows and lime accents. The camera and
lighting are composed for the page rather than left to the user to position.

- **Forfait / Devis d’expertise:** the vehicle approaches and enters the scan
  portal. Interior lighting and the tunnel explain the expertise workflow.
- **Chiffrage rapide:** a closer vehicle composition introduces photographic
  frames and an unfilled estimate document. The illustration contains no claimed
  price, detection or completed analysis.
- **Photos avant / après:** before/after photographic frames assemble around
  the vehicle. There is no AI scan visualization in this category.

Scene motion introduces a workflow; it is not API activity or analysis progress.
The primary action opens the actual selected dossier collection immediately.

## Playback and navigation

The selected film plays automatically once and holds its final composition.
The matching WebP poster shows the final pose, so reduced motion and blocked video
playback retain the complete illustration. Loading a new scene retains the
outgoing visual until the incoming visual is ready. Superseded media events do
not select or reveal older categories.

Selection is retained in the `parcours` query parameter. Three native selectors
support keyboard navigation and visible focus. The controls sit outside the
video crop and remain usable if a media request fails. Only the selected and
briefly outgoing scene need video elements during a transition.
The collection's Accueil action restores its category on the stage, as does
browser Back after opening a collection.

On the initial load the final pose stays hidden until playback starts or a
fallback is needed, avoiding a final-to-first pose flash. Media readiness has a
four-second budget that counts only visible, selected time. If both assets fail,
a restrained category placeholder preserves a deliberate stage surface. Media
nodes release their source on unmount, while outgoing crossfade frames remain
available until their layer is removed.

## Assets and reproducibility

The films and posters are local files under `public/cinematic/`. Blender source
under `scripts/cinematic/` uses the custom CABEK tunnel and the attributed
Ferrari model. Encoding uses ffmpeg H.264/yuv420p with faststart and no audio.
Car attribution and derivative-render license information accompany the assets.

Each film renders 24 actual Blender poses at 960 × 600. ffmpeg interpolates the
selection action to 24 fps; extracted intermediate frames are reviewed before
delivery. Posters render at 1000 × 625. The retained source models are offline
inputs; no GLB, Draco decoder or Three.js module is loaded by this screen.

All films are two seconds long, with 48 encoded frames at 24 fps and no audio.
The six runtime assets total **564,271 bytes (551.0 KiB)**.

| Scene            |          Film |       Poster |
| ---------------- | ------------: | -----------: |
| Expertise        | 163,040 bytes | 38,804 bytes |
| Chiffrage rapide | 157,538 bytes | 34,704 bytes |
| Avant / après    | 138,789 bytes | 31,396 bytes |

## Verification

- `npm test`: **273 tests passed across 32 files**. Coverage includes route
  selection and restoration, hidden-tab loading budgets, failed playback,
  decoded-frame readiness, stale callbacks and media resource release.
- `npm run build`: TypeScript and Vite pass. Vite retains its advisory for the
  514.81 kB application JavaScript chunk above 500 kB.
- `git diff --check`: passes. Every new code/source file is below 500 lines.
- The home and preview routes and all six media URLs return HTTP 200 from the
  running Vite server, with the expected HTML/video/image content types.
- ffprobe confirms every film's encoding, size, frame rate, duration and absence
  of audio. Inspected intermediate and final frames retain complete geometry,
  show no obvious interpolation ghosting and match the posters' compositions.
- Visual QA uses the rendered posters and extracted video frames. Browser
  layout, responsive interactions and device playback remain manual checks.
  No Playwright or browser automation was used.

## Manual test checklist

- [ ] Open `/` and the existing `/preview/expertise` link. Confirm the cinematic
      selector appears with the shared frame and activity island.
- [ ] Select all three categories. Confirm each has a distinct, meaningful
      animation and the matching title, description and dossier destination.
- [ ] Confirm playback starts from category selection, ends once and holds its
      final composition without looping or showing playback/orbit controls.
- [ ] Switch rapidly through categories under a slow connection. Confirm no
      stale clip appears and the previous visual remains while the next one loads.
- [ ] Block a video request or autoplay. Confirm the poster and actual category
      navigation remain usable.
- [ ] Fail the poster while delaying the video, then fail both media assets.
      Confirm the outgoing scene or category placeholder prevents an empty stage.
- [ ] Enable reduced motion before loading and during playback. Confirm the
      complete poster appears and decorative transitions settle.
- [ ] Leave the tab, return and navigate away during playback. Confirm hidden or
      unmounted videos stop consuming playback resources.
- [ ] Background the page for over four seconds before the first frame, then
      return. Confirm hidden time does not prematurely expire the load budget.
- [ ] Use keyboard-only selection and activate the collection link. Confirm
      focus and the URL selection remain coherent.
- [ ] Reload a category selection and use Back from a dossier collection.
- [ ] Check 320px, 390px, tablet, desktop, short landscape and 200% zoom for
      readable labels, useful image size and no horizontal overflow.
- [ ] Confirm category previews never send scan, upload or dossier-creation
      requests and preserve the existing dossier workflows.

Suggested commits:

- `feat(home): introduce cinematic category selection`
- `feat(motion): animate category changes with rendered vehicle scenes`
