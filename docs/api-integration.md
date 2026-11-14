# Frontend API integration

The frontend follows the backend contract in
`../cabek_ai_global/docs/api.md` and its `api/schemas.py` models.

`GET /api/dossiers/{id}/result` supplies current saved `vehicle` metadata and
original `photos` in every scan state. Dossier identity uses this top-level
vehicle first; `result.vehicle` remains the historical analysis snapshot.
The list endpoint supplies creation dates and remains a fallback while details
load. The original photo count comes from the detail response when available,
including zero. Reads never start scans or require a catalogue lookup.

Without a saved analysis, the Photos panel displays top-level originals using
`preview_url`, with an original-media fallback for older responses. Navigation,
thumbnails, loading feedback and image retry remain available. Annotation controls
and the comparison slider appear only when annotated photos are available from
`result.photos`. Polling active scans replaces originals with saved comparisons
when analysis completes. Estimates and PDF actions still use the saved result.

Opening preparation and decorative photo flights also accept top-level originals.
Completed dossiers retain the existing concurrent preparation of original, parts
and damages previews; critical-zone images remain excluded. Preview fixtures
include top-level vehicle and original photos for every status.

Vehicle selection sends only positive `marque_id` and `model_id` values to
`PUT /api/dossiers/{id}/vehicle`. The response contains canonical names and IDs,
not a complete vehicle; callers merge it with existing metadata. Names-only legacy
dossiers remain valid scan inputs. Scan admission stays on the backend; the scan
POST has no request body. API error codes retain their HTTP status and receive
French feedback, including validation, scan conflicts and unavailable artifacts.

## Verification

Verified: `npm test` (210 tests across 27 files), `npm run build` and
`git diff --check` all pass. Regression coverage includes
top-level vehicle precedence, zero originals, details arriving before the list,
original-only rendering in every status, workspace wiring, preview preparation,
ID-only vehicle updates, bodyless scan submission and structured API errors.
No browser automation was used. Live API access was blocked by the execution
environment's network restriction; live and visual behavior need manual checks.

## Manual test checklist

- [ ] Open a direct `/dossiers/{id}` link for an unscanned dossier. Verify saved vehicle values and original previews appear without starting a scan.
- [ ] Browse originals using thumbnails, previous/next and keyboard arrows. Confirm there are no annotation buttons or comparison slider before analysis.
- [ ] Check queued, processing and failed dossiers with original photos; verify originals remain inspectable and active progress is refreshed from the server.
- [ ] Keep a processing dossier open until completion. Verify Pièces/Dommages and the comparison slider appear, and Estimation/PDF use the saved result.
- [ ] Open a completed dossier from home. Verify preview loading counts, folder/photo motion, both comparison modes, estimates, source-photo navigation and PDF download.
- [ ] Compare the sidebar against top-level `vehicle`, including when it differs from `result.vehicle`. Check ID-only metadata, null IDs, missing names and zero photos.
- [ ] Throttle or fail list/result/image requests. Verify usable retained data, retry actions, no accidental scans and working image retries.
- [ ] Verify vehicle updates send only IDs and preserve other metadata; confirm catalogue failures and scan conflicts have readable French feedback.
- [ ] Check phone portrait/landscape, desktop, keyboard focus and reduced motion. Confirm original-only images fit the same workspace without overflow.
- [ ] In preview mode, open direct links for unscanned and completed example dossiers and verify both photo presentations.

Suggested commits:

- `feat(api): support current vehicle metadata and originals in dossier results`
- `test(api): cover updated dossier and vehicle selection contracts`

## Physical tunnel lighting

The existing `createTunnelCaptureStore.start()` → `api.startCapture()` request now
also drives the ESP32 through the backend capture lifecycle. No new browser state
machine, startup POST, hardware credentials or serial connection belongs in React.
Routing, refreshing and restoring a capture continue to read status without
replaying startup or success lighting events. The 3D scene remains presentation;
its category colors are independent of actual strip acknowledgments.

The backend enters red before photo delivery, green after every required photo is
saved/validated, and white after a 10-second completion interval when its actual
capture services are ready. Failed/interrupted captures never trigger green. A new
capture supersedes that interval, and lighting outages do not fail normal capture.
Maintenance tests cannot replace an active capture's lights.

See the [lighting API contract](../../cabek_ai_global/docs/lighting-api.md) and
[Linux deployment/manual hardware checklist](../../cabek-esp32/docs/lighting-deployment.md).
Use the existing capture UI for end-to-end acceptance; do not fabricate capture
success through the maintenance API. No lighting token should appear in `VITE_*`
configuration or browser bundles.


## Lighting maintenance

The opt-in `/maintenance/lights` route provides an operator-only controls panel.
It uses existing surface/button styling and French labels, and requires a manually
entered maintenance credential before displaying controls. The server reports the
caller's `can_preview` permission and enforces maintenance authorization on every
write. The credential lives only in component memory; refresh/logout clears it.
No token belongs in `VITE_*`, local/session storage, a URL, or a saved bundle.

The panel reads `/api/v1/lights/status`, `/capabilities` and `/effects`; opening,
polling and refreshing never POST lifecycle/lighting changes. Polling is sequential
with cancellation on unmount and a one-second gap between reads. Start submits
only parameters advertised for the selected effect; Stop returns to the backend's
current lifecycle. Capture or unavailable readiness disables preview controls;
the backend also rejects competing requests. Previews have a server-side timeout,
so logout does not need to send an implicit hardware command.

With negotiated RGB firmware, the backend now uses awakening, breathing, smooth
white transitions, Target Lock/red pulses, success/green hold, amber warning and
shutdown fade. The capture requests and server-owned 10-second deadline remain
unchanged. Unsupported zone effects are disabled for the global RGB decoder;
explicit simulated pixels appear as colored logical-zone swatches marked as
simulation. No simulated frame or serial confirmation establishes visible LEDs.

Use the [updated effects API and curl examples](../../cabek_ai_global/docs/lighting-api.md)
and [firmware/manual checklist](../../cabek-esp32/docs/lighting-effects.md).
