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
capture. Normal mode switches to green when photographs finish; Slow mode waits
for validated AI completion. Green returns to white ten seconds later.
A new capture cancels that countdown. Failure selects `warning`; shutdown sends
bodyless `POST /api/lights/off`. A single background HTTP worker keeps lighting
outages outside capture requests. The Blender twin uses confirmed capture status to display solid red, green on
success and amber on failure. Its standby tint, RGB brightness and inspection
brightness are local presentation settings. Hardware commands remain owned by
CABEK AI. See the [studio guide](../scripts/scanner/README.md).

## Central settings

Click the Dynamic Island five times, with less than 600 ms between clicks, to
open `/settings`. A single brand click returns home after that window; modified
link clicks and activity buttons keep their existing behavior. The settings page
is the central place for application settings, currently with hardware light tests.

Opening the page sends no hardware command. Use solid presets or choose any
supported effect, brightness, duration, speed, easing, repeat and color palette.
OFF stays available during a pending test. Accepted manual tests cancel the previous green
completion countdown; a new capture still sends its normal automatic command.

The browser uses only CABEK AI's configured `VITE_API_BASE_URL`:
`POST /api/settings/lights/set` and bodyless `POST /api/settings/lights/off`.
CABEK AI forwards commands to its server-side `CABEK_LIGHTS_API_URL`; the browser
never knows that address. Upstream validation, firmware and delivery errors are
shown on the page. A successful result confirms initial delivery, not visible
LEDs or future frames. Repeating tests persist until replaced or switched off.

Hardware settings require local access. Vite rejects LAN requests to the settings
API before proxying, including encoded separators; the backend checks loopback
clients too. Preserve that boundary in a production reverse proxy. Five clicks
are a navigation shortcut, not an authentication mechanism.

### Operating mode, diagnostics and local logs

Settings now includes a backend-confirmed **Mode lent** switch. It defaults to OFF
and applies to the next capture. Normal mode turns interior lights OFF and exterior
green after photo delivery. Slow mode retains interior ON, exterior red and tunnel
ownership through analysis, metadata waiting and pricing. Verification remains
capture-driven. The 3D exterior cue uses the capture response's `slow_mode` snapshot.

The diagnostics section reads cached status on entry; **Tout tester** runs only safe
browser/backend checks. Individual checks cover browser assets/WebGL, API, storage,
mock capture readiness, model dependencies, AutoEstimate and the lighting services.
Device reachability, disabled services and untested physical output are distinguished.
Manual sections separately offer exterior effects, Shelly status/ON/OFF, a real price
lookup and capture/AI actions against an explicitly selected test dossier. Backend
eligibility and tunnel ownership remain authoritative; a reserved tunnel rejects
manual lighting changes.

Logs record errors across the app, including before Settings opens. Browser history
is capped at 1,000 entries / 1 MiB and survives reloads when localStorage works.
Server logs rotate independently. The viewer filters by severity, component, text,
time, dossier or AI run; worker logs require selecting a dossier. Refresh can pause,
older server entries can load, and visible filtered events plus the latest diagnostic
snapshot can be copied/exported. Browser history remains available when the API is
offline. Sensitive credentials are redacted, and raw request bodies are never logged.

The local-only maintenance routes are `/api/settings/operation`,
`/api/settings/diagnostics`, `/api/settings/diagnostics/run`,
`/api/settings/diagnostics/pricing`, and `/api/settings/logs`. Existing interior and
exterior maintenance endpoints are reused. The browser never calls device URLs.
