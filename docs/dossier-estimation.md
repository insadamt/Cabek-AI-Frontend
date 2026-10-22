# Dossier results: photos, estimation and damages

The details page has two persistent tabs: **Photos** and **Estimation**. Both panels remain mounted so changing tabs retains the comparison, selected photo and last selected part. Desktop panels also retain their internal scroll positions. Photos is selected on arrival. The existing folder entrance completes before the workspace becomes interactive.

Desktop keeps the frame within one dynamic viewport. The left sidebar contains the folder, vehicle identity and always-visible **Informations du dossier** metadata; overflow stays inside the sidebar. The right workspace owns the tabs and active panel. Estimation keeps its financial summary above an independently scrolling parts list. At narrow widths, the cards use one column. On mobile and short phone landscape, the identity, all dossier metadata and the active result share one scrolling area within the viewport. The result tabs stick to the top as the metadata scrolls away. There are no separate sidebar or estimate scroll regions on phones. The Photos panel retains its useful minimum comparison height. There is no document-level scroll.

## Estimation and damages

The compact summary puts the saved financial total in MAD first and counts of repair, replacement and verification decisions. Incomplete finances put the numeric **SOUS-TOTAL CONNU** first and explicitly show **Estimation incomplète** underneath. Detailed translated missing-price warnings remain in the drawer. Unknown costs are never replaced with zero. The five financial categories are displayed from the saved result; the frontend does not calculate prices or change engine decisions. PDF download uses the existing validated download service, with pending and failure feedback. Preview mode and unavailable report URLs disable download.

Each part card is a single button showing its generic reference illustration, full part name, action icon, colored damage-type badges and saved price or **Prix incomplet**. Cards use compact horizontal rows in a responsive grid and stay the same size when selected. Fixed thumbnail bounds keep the complete illustration visible without intrinsic image sizing enlarging or clipping it. Opening a card presents a native modal drawer with the part illustration, damage observations, separate severity labels, financial breakdown before source photograph thumbnails. Four source views appear initially, with an explicit action to show the remaining views. Confidence stays behind **Informations de détection**. An empty parts array does not claim that no detections exist.

**Détail du montant** opens the global financial breakdown in the same drawer shell. The workspace owns one drawer selection, so global and part details cannot stack. Incomplete pricing stays explicit in the overview through the status and known subtotal; full missing-price warnings live in the drawer. The overview contains no inline financial breakdown or expanded part content.

Damage labels map all eight model classes to readable French labels. Muted amber, violet, terracotta, slate, indigo, rose, mauve and blue backgrounds distinguish type; text and icons keep the badges understandable without color. Severity is stated independently. Missing or invalid confidence is shown as unspecified rather than inferred.

Source links resolve exact photo IDs or original-image filenames, including encoded names and path-qualified engine references. Ambiguous filenames and unresolved references remain readable without a misleading navigation action. A source action finishes the drawer exit and closes the native modal before selecting the matched photo in Dommages mode, resetting the split to 50%, switching to Photos and focusing its tab. Duplicate references to one resolved photo produce one thumbnail. Unavailable references use a short notice rather than raw filenames. Preview source references use the example photo IDs so this flow can be inspected locally.

## Motion and accessibility

The tab selection background uses the existing 240ms selection motion. The selected panel fades over 120ms without moving the content. The desktop drawer enters over 200ms and exits over 160ms. Phone drawers use a 24px rise and fade over 180ms and an 18px exit over 140ms. The backdrop fades over 140ms without backdrop blur. These changes reduce travel and remove full-screen blur work; frame-rate improvements have not been measured on a phone. Desktop uses a right side panel up to 520px wide and full viewport height. Mobile and short phone landscape use a bottom sheet at 92dvh. Its header and close button remain outside the scrolling body. Escape, backdrop activation and the close button share the same exit. Clicking empty space inside the drawer does not dismiss it.

The native dialog traps focus and makes the page inert. Normal dismissal restores focus to its opener with `preventScroll`, retaining the list position. Source-photo navigation runs only after cleanup releases native modal focus. External unmount cancels queued photo navigation and releases listeners and scroll locking. Resizing settles current travel; reduced motion skips or finishes active travel. Main controls keep 44px touch targets. Native detection disclosure semantics, hidden inactive panels, arrow/Home/End tab navigation and visible focus remain in place. Financial values appear at their actual final amount.

## Generic image assets

The 18 part families contain 25 specific variants, plus one generic fallback. Illustrations are decorative references, not photographs of the inspected vehicle. Left and right mean the vehicle's own perspective. An unspecified side uses the generic fallback rather than choosing a side. Pneu is rubber only; Roue is an alloy rim. Images load lazily and use a neutral icon fallback after an image error.

Assets live in `public/images/parts/` as optimized WebP. The built-in imagegen tool generated each asset separately; no CLI/API fallback was used. The reproducible prompts are recorded in `part-illustration-prompts.json`. The full generated originals remain in the imagegen output directory; runtime assets are project-local. Anatomical fidelity and left/right recognizability require human visual review before treating any generic art as more than a decorative reference.

## Verification

Verification passed: `npm test` (193 tests across 25 files), `npm run build` and `git diff --check`. All 26 WebP assets were decoded and checked against the prompt manifest; they total 246,844 bytes. A contact sheet was visually inspected for consistent style and recognizable part shapes.

Unit checks cover part/damage label mapping, missing-side fallbacks, blocked decisions, repeated detection IDs, exact and ambiguous source resolution, complete/incomplete/zero finances, empty and unavailable results, retained estimates after refresh failure, bounded source galleries, pricing before photographs, tab semantics, native-modal lifecycle, close completion, duplicate dismissal, focus restoration without scrolling, reduced motion, resize settlement and external-unmount cancellation. Browser automation is not used. Device layout, visual motion and keyboard interaction require the checks below.

## Manual test checklist

- [ ] At 1440×900 and 1280×720, confirm the entire page stays within the frame; only the sidebar and estimate details scroll as needed.
- [ ] Check a short desktop window, 320px/390px phones, landscape and 200% zoom. Confirm dossier metadata needs no toggle, the mobile page has one internal scroller, tabs stick while browsing results, and long part names remain reachable without horizontal or document overflow.
- [ ] Switch tabs repeatedly. Confirm the indicator and panel animate, selected photos/splits remain intact, the last selected card is retained, and desktop panel scroll positions are retained.
- [ ] Activate cards with pointer, Enter and Space. Confirm the grid does not expand or rearrange, and the right drawer/mobile bottom sheet opens with matching details.
- [ ] Open **Détail du montant** and verify one global drawer with the saved amounts and missing-price warnings. Confirm there are no stacked drawers.
- [ ] Close through the close button, Escape and backdrop, including immediately after opening and with repeated clicks. Confirm the exit completes, the opener regains focus and the list does not jump.
- [ ] Click empty space inside the drawer: it must stay open. Tab/Shift+Tab must stay inside; background controls must remain inert.
- [ ] Scroll a long drawer on desktop, 320px/390px phones, landscape and 200% zoom. Confirm its title and close button remain reachable and the page does not scroll behind it.
- [ ] Resize or rotate during entry/exit; enable reduced motion during both. Confirm the drawer settles and closing never leaves a backdrop or scroll lock.
- [ ] Navigate away while the drawer is exiting; verify pending source-photo navigation is canceled.
- [ ] Open a source photograph from a part. Confirm Photos, Dommages mode, the correct photo, centered split and focus on the Photos tab. Return to the highlighted card at the same list position.
- [ ] Check the complete illustration fits each compact card and drawer hero without cropping, including unknown-part artwork.
- [ ] Confirm incomplete estimates lead with the known numeric subtotal and retain a clear incomplete label.
- [ ] Check pricing appears before photographs in a part drawer, with four initial photos and an action to reveal the rest.
- [ ] On a phone, check rapid open/close and tab changes: the drawer should use short travel without backdrop blur.
- [ ] Check every generic illustration, especially left/right variants, glass, wheel versus tire and unknown or side-unspecified names. Break an asset URL and confirm the icon fallback.
- [ ] Inspect all eight colored badges with and without color; verify readable labels/icons and separate severity/confidence.
- [ ] Check complete, incomplete, zero, absent and large estimates against the saved API response. Missing prices must never appear as zero or as a complete total.
- [ ] Check pending, failed, missing-result and refresh-error states, including a saved estimate retained after refresh failure.
- [ ] Download an available saved PDF. Check failure and retry, pending feedback and disabled preview/unavailable actions.
- [ ] Use Tab, arrow keys, Home and End through the tablist; hidden controls must be unreachable. Photo arrow navigation and the comparison slider must retain their own keyboard behavior.
- [ ] Enable reduced motion before loading and during tab/drawer/detection-disclosure motion. Confirm settled usable states without replaying the folder arrival.
- [ ] Repeat existing folder opening, photo preloading and image failure/retry checks; confirm no new scan is submitted.

Suggested commits:

- `fix(dossier): simplify layout and shorten mobile drawer motion`
- `fix(dossier): show metadata directly and contain part illustrations`

## PDF download notification

The report downloads directly through the existing validated PDF service. The
dynamic island shows “Téléchargement du PDF…” while fetching, then
“Téléchargement lancé” for 3.5 seconds after handing the file to the browser.
This confirms download initiation; browser save completion is not observable.
Failures show “PDF indisponible” for 6 seconds and retain the existing detailed
error in Estimation. The previous island activity resumes after dismissal.
A newer download takes priority over older responses and dismissal timers.
There is no document travel or conversion animation.

Verification: all 193 existing tests pass, production build passes (with a bundle
size warning), and `git diff --check` passes. Browser automation was not used.

Manual test checklist:

- [ ] Download an available report: verify one direct download, island loading feedback, then a brief confirmation and restored branding/activity.
- [ ] Throttle the request: confirm loading persists until the PDF is ready and repeated clicks remain disabled.
- [ ] Fail the PDF request: verify island failure feedback, detailed inline error and a working retry.
- [ ] Start another download while confirmation is visible: verify the old timer does not dismiss the new status.
- [ ] Navigate during download: confirm feedback survives navigation and clears afterward.
- [ ] Check a 320px phone, keyboard activation and reduced motion; confirm readable feedback and no overflow.
- [ ] Confirm preview mode and missing report URLs still disable the action.

Suggested commit: `feat(dossier): show PDF download notifications in dynamic island`
