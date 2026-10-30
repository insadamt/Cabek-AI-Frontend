# Prepared studio entrance

This report explains the loading screen and coordinated Island, card and model
entrance, which hide incomplete frames and make arrival feel coherent. It depends
on HomeFrame, useStageEntrance, stageVisit, the lazy Three.js runtime, local model/decoder,
shader compilation, browser font/image readiness and scoped CSS animations.
It supersedes the previous immediate category display described in
[scanner-playback-fix.md](scanner-playback-fix.md); the enlarged frontal camera
and left-side composition are retained.
The later [retained studio runtime](studio-cache.md) keeps the loaded model and
GPU scene alive across route visits.

## Behavior

- The stage starts with a full preparation screen and an indeterminate loading
  indicator. Island, categories and canvas remain mounted, hidden and inert;
  their layout and GPU preparation can complete without exposing partial content.
- Preparation waits for the decoded car, compiled scene shaders and an actual
  complete render, plus font readiness and decoded island branding. There is no
  fabricated percentage or artificial minimum wait.
- Once prepared, the loader fades out over 180ms. The Dynamic Island pops down
  from the frame at 60ms, the cards rise with an 80ms stagger starting at 180ms,
  and the model rises into its existing left-side position at 180ms. All UI
  entrances finish within 900ms. The vehicle stays still throughout this reveal;
  its 2.2-second animation starts only when the last entrance finishes. Categories
  are already in place before the car moves.
- The header wrapper owns the Island entrance; its existing surface, width and
  analysis animations stay independent. The scene moves vertically during reveal
  without changing canvas dimensions or sliding to the left.
- Final CSS animation completion removes the loader and entrance state and cues
  vehicle playback. Camera input and Skip/Reset stay unavailable until this cue,
  preventing interaction from interrupting the entrance. Category
  changes and scene retries do not replay the whole page entrance.
- Browser Back/Forward and internal returns such as **Accueil** restore the
  settled Island/cards immediately without a preparation/progress page or either
  entrance. A ready studio reattaches its cached canvas and GPU resources instead
  of rebuilding the model. The shared route transition leaves it still on return.
- Visits are remembered in application memory, after commit, so Strict Mode
  cannot accidentally suppress the first entrance. Full-document history restores
  use navigation timing. A deliberate refresh starts a new introduction; the
  category query remains selection context rather than an animation switch.
- Reduced motion still waits for real preparation, then shows the complete
  interface and parked car immediately. Enabling it during entrance settles the
  page. Hidden/offscreen runtime motion continues to pause normally.
- Failed optional font/logo resources cannot trap the page. Model, shader,
  first-frame or context failures release the loader into the error/retry view
  with working category navigation. Route changes retain and pause the cached
  scene; app teardown ignores late work and disposes its resources once.

## Verification

- `npm test`: 393 tests pass across 45 files, including immediate return controls,
  no return loader, cache ownership, preparation, runtime visibility and cleanup.
- `npm run build`: TypeScript and production build pass, with the existing Vite
  chunk-size advisory. Targeted Prettier and `git diff --check` pass; changed
  source/test files remain below 500 lines.
- Runtime checks cover first-frame readiness, waiting for shader preparation,
  explicitly cued playback, shader/render failures, late completion after disposal
  and the existing camera/visibility behavior.
- Preparation checks cover fonts and image decoding completing in either order,
  resource errors and environments without the optional browser APIs.
- Server-rendered route checks verify the loading announcement and inaccessible
  unfinished controls. Header checks verify that only the stage opts into this
  entrance; dossier/collection headers retain their existing behavior.
- No Playwright, browser automation or image rendering was used. Visual timing,
  GPU appearance and device frame rate remain manual verification.

## Manual test checklist

- [ ] Cold-load `/` on a throttled connection: verify one preparation screen,
  no partial tunnel/car flash and no font or logo jump on reveal.
- [ ] Repeat with a warm cache: verify the same short sequence without an
  unnecessary loading delay.
- [ ] Watch Island → staggered cards + model; check a gentle pop, no clipping,
  stable larger frontal framing and no movement from the centre to the left.
- [ ] Verify the car stays still until the Island, cards and scene have settled,
  then starts its animation once. Check canvas input and Skip appear only after
  that cue, including on a warm-cache reload.
- [ ] Select categories while the car enters; verify correct lights and dossier
  destinations without replaying the page entrance.
- [ ] Open a collection and use browser Back and **Accueil**. Check the selected
  context and immediately visible Island/cards, with no progress page, preparation
  text, replay or route slide. Verify the scene appears parked once ready.
- [ ] Repeat Back/Forward, including leaving before the vehicle finishes. Verify
  return always restores a parked car. Refresh deliberately and check the intro
  plays again, including direct category URLs.
- [ ] Enable reduced motion before load and during reveal; verify immediate
  complete states once ready, readable loading text and no progress loop.
- [ ] Fail model loading, shader preparation or WebGL context; verify the loader
  clears, retry works and dossier navigation remains reachable.
- [ ] Navigate away during preparation/reveal and hide/restore the tab; verify
  no late reveal, duplicate entrance or hidden render loop. Return and check the
  same cached model/canvas is reused.
- [ ] Test 320px/390px phones, desktop, short landscape and 200% zoom. Check
  Island joins, card pop, model clearance, keyboard focus, Skip and Reset.
- [ ] Open a dossier and run its existing activity transitions; verify its
  Island does not inherit the stage's page entrance.

## Suggested commit messages

- `feat(home): prepare studio before coordinated island cards and model entrance`
- `test(scanner): guard shader readiness and first-frame reveal`
- `fix(home): restore settled studio on back navigation`
