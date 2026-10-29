# Category workflows implementation

This report describes the category-first CABEK AI frontend, its backend integration,
verification results and manual acceptance checks. It depends on the existing glass
folder/carousel motion, dossier viewer and CABEK Global workflow API.

Implemented on `codex/category-workflows`, branched from `codex/categoriesFolders`.
The workflow implementation was delivered in `c267cd3`. The subsequent category
landing refinement is documented in [category-stage.md](category-stage.md).

## Routes and behavior

| Route                              | Experience                                                            |
| ---------------------------------- | --------------------------------------------------------------------- |
| `/`                                | Live 3D vehicle and scanning bay with three category selectors        |
| `/categories/forfait-expertise`    | Existing externally created expertise collection; no creation action  |
| `/categories/chiffrage-rapide`     | Quick-estimation collection and creation action                       |
| `/categories/verification`         | Before/after collection and creation action                           |
| `/categories/chiffrage-rapide/new` | Required vehicle form, then the new dossier's photo collection        |
| `/categories/verification/new`     | Same vehicle form, then before/after capture                          |
| `/dossiers/:id`                    | Existing identity/entrance and the workspace selected from API `type` |

The three collections share `Home`, `DossierCarousel`, `HomeSearchResults`,
`DossierFolder`, `FolderDocument`, `HomeFrame` and the activity island. Category
controls progressively disclose date/status/sort filters. Every live collection
query is sent to the API; no full-collection client filtering is performed.

Search presence selects the grid, including an empty search. Search, workflow
filter, creation dates, sort, pagination and carousel position are preserved in URL
parameters. Folder opening carries the exact originating URL in history state.
Successful creation replaces the form's history entry, so Back returns to the
collection. Direct dossier links fall back to their API category.

`DossierCreationForm` uses CABEK's existing vehicle catalogue endpoints. Changing
the marque clears the selected model; stale catalogue responses are aborted.
Marque, model, nonblank matricule and a complete valid registration date are
required before creation. No dossier is created when merely opening the form.

`WorkflowPhotoCapture` shares side selection and saved-photo browsing. Quick
estimates open their workspace from the collection before analysis, support
multiple photos per side and need only one side. It disables
scan admission without saved photos and complete metadata. Uploading disables
the scan action until the pending files finish. Each accepted upload updates the
collection immediately; a later failure retains accepted photos and leaves only
the remaining files selected. Cancellation refreshes saved server state rather
than claiming an accepted upload was undone.

`QuickEstimateWorkspace` reuses `DossierResultWorkspace`, the original/annotated
viewer, financial estimates, PDF service and existing island scan lifecycle.
`VerificationWorkspace` has no analysis, financial, annotation or report controls.
Its four-before/four-after progression uses saved evidence, the API comparison's
missing-side arrays and finalization flags. Comparison presents independent
before/after originals side by side, with side selection and image retry.
Frontend action eligibility and the scan lifecycle both reject verification.

## Motion and accessibility

The homepage automatically runs one continuous close POV, elevated tunnel reveal,
vehicle entry and leftward camera composition. Three numbered workflow panels
then enter vertically on the right. Category selection changes the live 3D tunnel
lighting and collection destination; the separate collection link navigates
immediately. The parked vehicle stays in place while muted lime or soft white
lighting transitions. Manual orbit/zoom retains camera ownership; direct category
URLs and reduced motion initialize the parked composition. See
[category-stage.md](category-stage.md) for camera controls and scene lifecycle,
and [premium-homepage-polish.md](premium-homepage-polish.md) for current verification.
New vehicle forms and side/phase changes use scoped GSAP reveals. Newly saved photo
IDs trigger local confirmation motion; unchanged polling data does not replay it.
Resize, navigation and reduced motion settle or clean up active animations.

The existing carousel momentum, document extraction, folder opening, grid focus,
search-control Flip morph, grid rearrangement, activity island and dossier entrance
are reused. New motion does not introduce network delays. Category selectors are
native buttons in a keyboard-accessible tablist, with a separate collection link.
Forms have labels, required fields and error/status announcements. Sides, phases
and views are native buttons with pressed states, 44px targets and moving selection
backgrounds. Registration values retain bidirectional text support.

## Backend contract

The authoritative contract became available during implementation at
`../cabek_ai_global/docs/dossier-workflows-api.md`. The frontend was checked
against that document and the corresponding routes/schemas. Backend files were
read only; their concurrent changes are not included in this frontend commit.

| Endpoint                               | Frontend use                                                         |
| -------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/vehicles/marques`            | CABEK-proxied AutoEstimate marques                                   |
| `GET /api/vehicles/models?marque_id=…` | Models for the selected marque                                       |
| `GET /api/dossiers`                    | Category/search/workflow/date/sort filtering and paginated folders   |
| `POST /api/dossiers`                   | Type 2/3 creation with IDs, matricule and full registration date     |
| `GET /api/dossiers/{id}/result`        | Current metadata, originals, workflow, comparison and saved analysis |
| `POST /api/dossiers/{id}/photos`       | One multipart `file` with `side` and verification-only `phase`       |
| `POST /api/dossiers/{id}/scan`         | Existing guarded, bodyless scan submission for supported types       |
| Returned media/preview/report URLs     | Existing image loading and validated PDF download                    |

All transport remains in `src/lib/api.ts`. Multiple quick-estimate files use
successive requests, matching the single-file backend contract. The client checks
JPEG/PNG MIME and the 10 MiB file limit; the server validates signatures, decoding,
filename, pixel limits, locks and evidence rules. No automatic upload/creation
retry is introduced. Following a scan retains the established read-before-launch,
single-POST and lost-response recovery rules.

Live brand sorting remains unavailable: the contract supports ID and date sorts,
but has no brand sort identifier. The live option is explicitly disabled and a
direct unsupported sort query produces readable feedback. Preview supports brand
sorting to demonstrate the intended UI. Completing live brand sorting requires
a documented backend sort value; fetching everything for client sorting would
violate the server-pagination requirement.

Preview retains the existing expertise fixtures and adds quick-empty/ready/estimated and
verification 2/4, 4/4, 6/8 and 8/8 examples. Creation and uploaded originals persist
in browser-tab session storage, including reloads. Uploaded examples are decoded
before saving. Storage quota errors surface as failures rather than false success.
Preview does not simulate scans or generated results. The original expertise
fixtures remain read only.

## Verification

- The original workflow verification passed its route, integration and motion
  tests. Current homepage validation is recorded in
  [premium-homepage-polish.md](premium-homepage-polish.md).
- `npm run build`: TypeScript and Vite passed. Vite reports a JavaScript chunk
  slightly above its 500 kB advisory threshold.
- `git diff --check`: passed.
- New coverage includes routes, category/server filters, retained URL state,
  required dates and model membership, multipart side/phase fields, multi-file
  partial failures/cancellation, phase completeness/finalization boundaries and
  unavailable Type 3 AI actions. Existing expertise/result/motion tests still pass.
- No Playwright, browser automation or live AutoEstimate/inference tests were run.
  Static rendering/unit checks do not establish visual correctness or touch behavior.

## Manual test checklist

- [ ] Open `/`; confirm exactly three category selectors, readable labels, hover/focus feedback and keyboard selection. Use the scene checklist in [category-stage.md](category-stage.md).
- [ ] Open each category directly and through its collection link; confirm its identity, isolated dossier collection and Back to home.
- [ ] Verify expertise has no creation button and its `/new` URL is unavailable.
- [ ] Search by reference, matricule, marque and modèle; apply every category status, date range and supported sort. Check the actual API query and pagination.
- [ ] Switch grid/carousel, select a folder, open it and return with page Back and browser Back. Confirm search, filters, page, display and selected slide survive.
- [ ] Submit both new-dossier forms with missing fields, whitespace registration, invalid date and a model from another marque. Confirm no creation request until valid.
- [ ] Change marques rapidly and fail/retry catalogue reads. Confirm model reset, current-brand options and readable failure messages.
- [ ] Create a quick estimate with actual catalogue IDs. Confirm one creation POST, saved identity, folder entrance and photo collection.
- [ ] Upload one side, then multiple photos on another side. Confirm real saved counts, photo navigation and analysis eligibility without four sides.
- [ ] Fail the second file of a multi-file upload, retry remaining files, cancel during transfer and reopen. Confirm saved photos remain and accepted uploads are not repeated automatically.
- [ ] Test unsupported/corrupt images, files over 10 MiB, storage quota failures in preview and slow/disconnected requests. Confirm clear errors and no fabricated percentage/success.
- [ ] Run a real quick scan. Confirm immediate status read/scan launch, island progress, original/annotated inspection, estimates and available PDF.
- [ ] Open an existing expertise dossier in each scan state. Confirm originals, scan/follow, annotations, financial details, PDF and result errors remain usable.
- [ ] Create verification; save two before sides (2/4), then all four (4/4). Confirm after capture remains unavailable until the before set completes.
- [ ] Save two after sides (6/8), leave/reload/reopen and complete them (8/8). Confirm phase changes retain the selected vehicle side and saved photos.
- [ ] Compare every side. Confirm before and after images are separately labeled and independently retryable; no analysis, financial or PDF actions appear anywhere for verification.
- [ ] Verify server-finalized evidence remains locked, including a missing/corrupted finalized original. Confirm missing-side progress does not claim completeness.
- [ ] Test category opening, rapid search/clear, filter changes, folder focus/return, resize and navigation during motion. Confirm no stale transforms, false loading or stranded documents.
- [ ] Check 320px/390px phones, tablet, desktop and short landscape, safe areas, long labels, mixed Arabic/Latin registrations and 200% zoom. Confirm all controls remain reachable without horizontal page overflow.
- [ ] Use keyboard-only navigation and enable reduced motion before and during category, document and photo transitions.
- [ ] In preview, create both dossier types, upload photos and reload the same tab. Confirm persistence and clearly labeled example data without simulated analysis.

## Commit message suggestions

- `feat(workflows): add category-first dossiers and repair photo capture`
- `feat(cabek): add quick estimates and before-after dossier workflows`
