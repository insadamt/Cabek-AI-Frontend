# Required dossier metadata

A new scan or retry requires complete vehicle metadata. Missing or invalid fields block the entire scan, including damage detection and pricing. Existing incomplete dossiers remain searchable and viewable so their metadata can be corrected. Existing queued, processing and completed dossiers remain followable/readable; metadata validation must not trigger a rescan or overwrite saved results.

This contract extends `specifications/05 · API Contracts.txt` and the storage layout in `specifications/04 · Scan Lifecycle & Storage.txt`. The complete example is [examples/metadata.json](examples/metadata.json). Its catalogue IDs are illustrative, not verified production IDs.

## Stored format and required fields

Store `metadata.json` at `data/dossiers/<ID>/metadata.json`, separately from immutable originals and analysis output. The example uses a `vehicle` object consistent with the frontend API; the backend owns persistence and any migration from a different on-disk shape.

| Field                              | Rule                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `vehicle.marque`                   | Required nonempty string; canonical catalogue label for `marque_id`.                                       |
| `vehicle.modele`                   | Required nonempty string; canonical catalogue label for `model_id`. Keep the existing French `modele` key. |
| `vehicle.marque_id`                | Required positive safe integer; must exist in the catalogue.                                               |
| `vehicle.model_id`                 | Required positive safe integer; must exist under the selected marque.                                      |
| `vehicle.matricule`                | Required nonempty string; preserve leading zeroes and Arabic/Latin characters.                             |
| `vehicle.date_mise_en_circulation` | Required full calendar date, exactly `YYYY-MM-DD`. A year alone is insufficient.                           |
| `vehicle.date_sinistre`            | Required full calendar date, exactly `YYYY-MM-DD`.                                                         |

`dossier_id`, `created_at` and `schema_version` belong to the system, not the correction form. `created_at` is a timestamp; the vehicle dates are date-only strings without timezone conversion. Impossible dates such as `2026-02-29` are invalid. No additional chronological restrictions are introduced by this change.

The legacy `annee` field may still be returned for compatibility but is not required and cannot substitute for the full registration date. A display year can be derived from `date_mise_en_circulation`; do not guess a month/day for old year-only records.

## API integration

`GET /api/dossiers` must include both dates and catalogue IDs in each summary's `vehicle`, including null/missing fields for legacy dossiers. The frontend deliberately keeps the read type tolerant of incomplete legacy metadata. New save requests use the strict `RequiredVehicleMetadata` DTO.

The correction form reads `GET /api/vehicles/marques` and `GET /api/vehicles/models?marque_id=<id>`. Model options must be scoped to that brand. Changing the brand clears the model selection. Labels come from catalogue options rather than free text.

`PUT /api/dossiers/{id}/vehicle` must accept all seven vehicle fields from the example and return the full, persisted `Vehicle`. The backend validates IDs and the relationship, resolves canonical labels and saves metadata atomically. It must reject metadata edits while queued/processing or after successful completion, preserving the existing immutable analysis contract. Do not silently ignore registration/date fields or return success before persisting them.

Before `POST /api/dossiers/{id}/scan`, the frontend rereads the exact persisted summary, checks all required fields, and verifies catalogue IDs/labels. It sends no POST when these checks fail. An unavailable catalogue also prevents submission. Home folders with known missing fields show **Compléter** and open the correction screen; the expanded sheet and correction screen list each issue. Unsaved form changes block the detail-page scan button. Valid metadata still goes through the existing read-before-launch, one-time POST and conflict recovery lifecycle.

The backend must independently validate persisted metadata immediately before accepting/enqueuing a scan. This is essential because direct API callers and concurrent updates can bypass or invalidate a frontend check. Return HTTP 422 with all actionable issues and enqueue no work:

```json
{
  "error": {
    "code": "invalid_metadata",
    "warnings": [
      {
        "field": "date_sinistre",
        "code": "required",
        "message": "La date du sinistre est obligatoire."
      },
      {
        "field": "model_id",
        "code": "model_brand_mismatch",
        "message": "Le modèle sélectionné ne correspond pas à la marque."
      }
    ]
  }
}
```

Warning fields are relative to `vehicle`. Codes currently understood as descriptive issues include `required`, `invalid_date`, `invalid_catalogue_id`, `unknown_catalogue_id`, `catalogue_label_mismatch` and `model_brand_mismatch`. The frontend preserves arbitrary string codes and displays the backend's message as escaped text. It accepts the same payload inside `error`, inside `detail`, or at the response root. Save validation failures use this same warning shape.

## Delivery boundary

This repository contains the frontend implementation only. Backend persistence, independent scan/save validation, catalogue authority and summary serialization must be implemented in the backend repository. Frontend validation alone does not secure the scan endpoint. Deployment requires the expanded PUT payload and complete GET summaries above; older servers may reject or ignore the new fields.

## Manual test checklist

Automated verification passed: `npm test` (223 tests across 27 files), `npm run build`, and `git diff --check`. Tests cover complete/missing metadata, invalid IDs, calendar dates, catalogue relationships/labels, no POST on failed or cancelled preflight, preserved backend warnings, full metadata saves, and correction versus read-only result actions. Browser automation was not used; the device and backend checks below remain manual.

- [ ] Open an old dossier missing IDs and dates. Confirm **Compléter**, readable warnings for every missing field, and no scan POST.
- [ ] Open the sheet and correction page. Confirm they list missing fields and display the full registration date rather than a guessed year.
- [ ] Select a marque/model, enter registration and both dates. Change marque and confirm the previous model is cleared.
- [ ] Clear each required field, enter whitespace registration, and try an impossible date. Confirm saving/scanning remains blocked.
- [ ] Change a valid saved value without saving. Confirm scanning stays blocked until save succeeds; failed saves preserve the draft.
- [ ] Inspect PUT: all seven fields are sent, labels match catalogue options and the returned values survive reload.
- [ ] Make catalogue IDs unknown or mismatched, or make the catalogue unavailable. Confirm scan POST is never sent.
- [ ] With complete persisted metadata, launch from home and from the correction screen. Confirm one POST, visible queued/processing state and eventual saved results.
- [ ] Return a 422 with multiple field warnings from save and scan. Confirm the actual messages are readable and no success is shown.
- [ ] Follow existing queued/processing/completed dossiers with legacy metadata; confirm no new POST or metadata edit is offered.
- [ ] Navigate away during launch/polling. Confirm accepted backend work remains available without a duplicate launch on return.
- [ ] Check 320px/390px phones, landscape, desktop, keyboard focus and 200% zoom; fields, warnings and actions must remain reachable.
- [ ] Backend: call scan directly with invalid metadata and verify HTTP 422, all warnings, no queued job and no analysis output changes.

## Suggested commits

- `feat(metadata): require complete vehicle details before scanning`
- `docs(api): define metadata persistence and validation contract`
