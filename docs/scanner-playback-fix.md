# Scanner playback and reference landing view

This report explains the enlarged, more frontal scanner view and immediate workflow
access during the left-aligned entrance. It depends on
CategoryStage, the existing GSAP/Three.js bay runtime, the procedural tunnel and
the supplied studio-v2 vehicle. It supersedes earlier elevated homepage framing.

The later [prepared studio entrance](stage-entrance.md) adds a real loading gate
and coordinated Island/card/model reveal. Its loading and return-navigation
behavior supersede the immediate controls and replay-on-return described below;
the camera and left-side playback remain.

## Changes

- Categories and the dossier action are visible and keyboard-accessible from the
  first render, including loading and playback. The delayed menu reveal hook,
  hidden CSS and intro-dependent inert state have been removed.
- The scene plays in its left-side area from the first frame. Horizontal and
  vertical projection offsets stay constant, with a stable orbit target; there
  is no separate move to the left before showing categories.
- Vehicle motion and a subtle dolly finish in 2.2 seconds after model readiness.
  The opening is only 4% farther out, keeping the scene large throughout playback.
  Loading time is separate and never gates dossier navigation.
- Mobile field of view stays constant through entry, avoiding a quick zoom-out
  and zoom-in.
- Category URLs retain their selected workflow but now play the introduction on
  page load. Previously, any recognized `?parcours=` value initialized the scene
  as already parked, so refreshing after selecting a category skipped all motion.
- Selection within the current page still changes lighting without replaying or
  reloading the scene. Returning to the page starts a new introduction.
- The closer camera is `(4.3, 3.8, -9.5)`, looking at `(0, 0.6, 0)`. Its angle
  to the car's forward axis decreases from about 39° to 24°, so the car faces the
  screen more directly while retaining a little side detail. The whole view turns;
  the car remains correctly aligned inside the tunnel during its entrance.
- Equipment fills about 85% of wide-desktop height, up from 68%. The horizontal
  offset is at least 18%; a 2.5% upward projection offset keeps the enlarged deck
  above the lower edge. Responsive distance preserves menu and phone clearance.
- Completion, skip, reduced motion and reset share this camera endpoint. Existing
  orbit controls, responsive framing, loading failure and parked retry remain.

## Verification

- `npm test`: 364 tests pass across 41 files.
- CPU checks cover the first frame and overlapping entry/reframe poses on desktop,
  narrow desktop, phones and short landscape, including clearance from the visible menu.
- `npm run build`: TypeScript and production build pass. Vite retains the
  existing advisory for chunks larger than 500 kB.
- Targeted Prettier checks and `git diff --check` pass.
- Route regression checks cover immediate workflow access while loading/playing,
  including each valid category query.
- A real GSAP timeline test checks immediate motion, overlapping entry/reframe,
  a duration below 2.4 seconds, one completion callback and identical playback/skip
  landing projections. The projection matrix and orbit target remain unchanged
  throughout entrance, preventing a delayed slide toward the left.
- CPU projection checks use the actual equipment geometry. At the reference
  1862×956 viewport, its bounds stay near the screenshot's left-side composition;
  desktop equipment height is 75–88%, replacing the previous 64–74% view. Camera
  angle checks keep the front within 20–26° of facing the screen directly.
- Existing camera checks cover reset, interruption, resizing and reduced motion.
- No Playwright, browser automation or offline rendering was used. GPU appearance
  and perceived motion still require the manual browser checks below.

## Manual test checklist

- [ ] Reload `/` with reduced motion disabled. Check that categories are visible
  immediately and the car animates directly in the left area without a later slide.
- [ ] While loading and while the car enters, select categories with mouse and
  keyboard and open their dossiers; check that navigation never waits for playback.
- [ ] Select each category and refresh. Check that the introduction plays and
  the chosen category and dossier destination remain correct.
- [ ] Check that the scene is visibly larger from the first frame and that the
  car's grille and headlights face the screen more directly. Verify the deck,
  console and roof stay visible, with panels clear on the right.
- [ ] Skip the introduction; then orbit and use **Réinitialiser la vue** and the
  canvas Home key. Check they reach the same default composition.
- [ ] Switch categories after playback. Check lighting changes without another
  entrance; manually explored views remain under your control.
- [ ] Interrupt playback with a drag, hide/restore the tab, and enable reduced
  motion. Check coherent motion, immediate reduced-motion settling and controls.
- [ ] Check desktop, 320px/390px phones and short landscape for unclipped
  equipment, readable panels and reachable camera controls.

## Suggested commit messages

- `fix(scanner): play intro on category URLs and match reference landing view`
- `test(scanner): verify real playback and reference camera framing`
- `fix(scanner): replace slow close-up with a short clear entrance`
- `fix(scanner): enlarge left-aligned entrance and show categories immediately`
- `fix(scanner): zoom closer and turn the view toward the car front`
