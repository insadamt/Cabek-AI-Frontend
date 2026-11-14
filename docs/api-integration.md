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

CABEK AI sends direct `POST /api/lights/set` commands at startup, after application
startup completes, and around captures. It sends red repeating pulses during
capture, green `mission_complete` on success, then solid white ten seconds later.
A new capture cancels that countdown. Failure selects `warning`; shutdown sends
bodyless `POST /api/lights/off`. A single background HTTP worker keeps lighting
outages outside capture requests. No readiness probe or lifecycle snapshot is sent
to the lighting service. The 3D scene remains independent presentation.

## Lighting maintenance

Open `/maintenance/lights` on the tunnel PC. The panel sends only `/set` and `/off`
and makes no requests on mount. Choose an effect, brightness, cycle duration,
speed, repeat, easing and an optional color palette. Any command replaces the
current effect, including automatic capture output. OFF remains available while
SET is pending. Repeating effects persist until replaced or stopped; there is no
preview expiry or capture lock in the lighting service.

Responses confirm initial serial delivery, not physical appearance or future
animation frames. Legacy firmware supports only full-strength red, blue, green,
white and OFF; other outputs require the RGB extension and return a clear error
when unsupported. No connection status is inferred from previous requests.

Set `VITE_LIGHTS_API_BASE_URL` independently of the main application API URL.
Vite proxies `/api/lights` to `127.0.0.1:8001` and rejects non-loopback clients for
that proxy even when the rest of the app serves the LAN. Production access must
retain a trusted local boundary. No hardware credentials belong in browser code.
See the [API contract](../../cabek-esp32/docs/lighting-api.md) and
[deployment guide](../../cabek-esp32/docs/lighting-deployment.md).
