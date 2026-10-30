# Retained studio runtime

This report explains the loaded model cache, which makes Back/Accueil reuse the
existing studio instead of fetching, decoding and rebuilding it. It depends on
the app-level BayRuntimeCacheProvider, a single bayRuntimeCache entry, movable
canvas hosts, bayRuntime visibility controls and the existing preparation and
entrance policy. This is an in-memory cache for the current application session.

## Ownership and behavior

- The first stage visit lazily creates one canvas and runtime. The decoded car,
  tunnel, materials, textures, lighting, compiled shaders, renderer and camera are
  retained together after preparation.
- Leaving a route releases its canvas connection and pauses the runtime. It
  parks any unfinished drive, cancels queued frames, pauses camera/light motion
  and ignores detached-canvas resize notifications. It keeps the model and GPU
  resources alive instead of disposing them.
- Returning attaches the exact same canvas to the new stage host before paint,
  applies any changed category/motion preferences and resumes on-demand rendering
  at the actual viewport size. A ready cache immediately reports ready; no model
  fetch, Draco decode, tunnel reconstruction or shader preparation repeats.
- Existing orbit/zoom state is retained. Matching palette objects do not trigger
  redundant category camera tweens. The car returns parked even if the user left
  during entry or after taking over the camera mid-drive.
- Only the WebGL runtime is retained. HomeFrame, activity Islands and route
  analysis providers still unmount normally, avoiding duplicate hidden Islands
  or stale DOM targets in dossier activity.
- Pending module/model preparation continues once while away. It cannot resume
  playback without a connected page cue or update the previous page's React
  state. Stale connections cannot control a later owner.
- A failure is retained as an error state for the next visit. Explicit retry
  disposes that entry and creates a new parked scene. Application teardown also
  releases retained resources once and ignores late module imports/loads.
- Refreshing starts a new application/cache and keeps the existing fresh-load
  preparation and introduction. Resources are not persisted to disk; browser
  context loss still uses the existing error/retry recovery.

## Verification

- `npm test`: 393 tests pass across 45 files.
- `npm run build`: TypeScript and production build pass with the existing Vite
  chunk-size advisory. Targeted Prettier and `git diff --check` pass; changed
  source/test files remain below 500 lines.
- Cache checks cover canvas/runtime identity across return visits, one lazy load,
  paused ownership, readiness before playback, pending imports while away, stale
  subscribers, error/retry replacement and app/development teardown.
- Runtime checks verify no frames or zero-size resize work while detached, one
  vehicle load/preparation after resume and retained vehicle resources.
- Choreography checks verify parking after manual camera takeover without a
  repeated completion callback. Route checks verify one canvas host per studio.
- No Playwright or browser automation was used. Visual immediacy, GPU frame time
  and browser context retention remain manual checks.

## Manual test checklist

- [ ] Load `/`, finish or skip the intro, then open a collection and use Back or
  Accueil repeatedly. Confirm the model returns immediately without a loader,
  blank rebuilding interval or another entrance.
- [ ] In browser DevTools, watch requests while repeating the navigation. Confirm
  the car GLB and Draco assets are not requested/decoded again on every return.
- [ ] Orbit and zoom, open a collection and return. Confirm the same view is
  retained, Reset works and category lights/destinations still match selection.
- [ ] Leave while the car enters, including after manual camera takeover. Return
  and confirm a parked car with no resumed/second entrance.
- [ ] Navigate away while preparation is pending, then return. Check one loading
  operation completes and the cached scene is parked rather than entering again.
- [ ] While a collection/dossier is open, inspect performance: no hidden scene
  render loop. Check dossier analysis still targets its visible Island.
- [ ] Resize while away, including phone rotation, then return. Check correct
  camera framing, canvas resolution, category clearance and controls.
- [ ] Lose the graphics context or fail loading, leave/return, then retry. Check
  the error remains usable and retry creates one replacement scene.
- [ ] Refresh deliberately. Confirm the initial preparation/intro still plays.

## Suggested commit messages

- `perf(scanner): retain loaded studio runtime across navigation`
- `test(scanner): cover cached canvas ownership pause and retry cleanup`
