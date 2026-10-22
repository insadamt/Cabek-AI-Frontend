# Motion enhancements

The app follows the compact, quiet, readable direction in `specifications/02 · Frontend UX.txt`. Motion explains actions and state changes while keeping vehicle information, financial values and real analysis progress readable. Existing scan safety rules in `specifications/04 · Scan Lifecycle & Storage.txt` still apply.

## Implemented behavior

| Area                       | Behavior                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analysis launch            | Status reads and the existing guarded scan launch start immediately, alongside the document presentation. Presentation does not delay backend work.                                                                                   |
| Document journey           | Extraction and insertion wait for the document timeline's actual completion instead of estimating its duration with timers. An already-open sheet can proceed immediately.                                                            |
| Scan safety                | Read-before-launch, one-time POST, conflict recovery, uncertain launch recovery and server-sourced progress remain in the existing lifecycle service.                                                                                 |
| Success                    | Browsing and opening the saved result are available after the sheet is safely inserted. The brief Terminé confirmation can remain visible without locking the workspace.                                                              |
| Dialogs                    | Close, Escape and backdrop dismissal share one exit. The native dialog and focus trap remain mounted through the exit, then scroll and focus are restored.                                                                            |
| Mobile navigation          | Drawer and scrim animate out before becoming hidden. Reopening during closing retargets the CSS transition.                                                                                                                           |
| Part and financial details | Native details semantics are retained. Height and chevron changes animate together, and repeated activation reverses from the current height. Resize or reduced motion settles to the requested state.                                |
| Photo comparison           | Both requested images load and decode before replacing the visible pair. The previous pair stays visible during loading and underneath the incoming crossfade. Failed or superseded requests cannot replace a newer pair.             |
| Viewer controls            | Annotation selection gets a moving background. The comparison handle has hover, keyboard-focus and press feedback without easing its pointer position. Switching mode preserves the split.                                            |
| Dashboard presentation     | Existing cards translate between grid and list positions at their natural size. Unchanged cards remain steady, including during polling.                                                                                              |
| Search and filters         | Existing dashboard results remain visible while the next request loads. Filter and view selections move a shared background independently of their text. Query-only navigation keeps page scroll.                                     |
| Search folder grid         | Only moved or new folders animate. Measurements account for grid scrolling. Returning from a focused folder does not start a competing rearrangement.                                                                                 |
| Carousel                   | Settling duration follows the remaining distance. Pointer tilt updates CSS through GSAP without rendering the React folder tree for each hover event. Counter changes animate locally.                                                |
| Activity island            | Width changes use shorter transitions and skip unchanged targets. The existing compact, single-row 44px layout, connected contour and material fusion remain intact.                                                                  |
| Entrances                  | Already-mounted headings and controls do not repeat their entrance when results or status change. Offscreen content remains immediately available.                                                                                    |
| Navigation                 | Route changes get a short content entrance; query changes stay local. Sidebar selection has a moving background. Back and existing scroll restoration remain available.                                                               |
| Text                       | Headings reveal whole words. Brand lettering gets a brief initial reveal. Updated labels, counts, status badges and save feedback crossfade locally. Assistive technology receives one readable version.                              |
| Feedback                   | Buttons and action links share press feedback. Arrows move slightly on hover, search matches reveal their highlight, and financial totals appear with their actual final amount.                                                      |
| Notices                    | Dashboard/dossier synchronization errors, action errors and outgoing scan panels enter and collapse with their surrounding layout. Exiting content is inert and hidden from assistive technology.                                     |
| Progress                   | Dossier progress uses a transform-based fill interpolated between received photo counts. No analysis percentage or financial amount is invented.                                                                                      |
| Reduced motion             | Shared Web Animations finish at their real end state if the preference changes. Dialogs, folder extraction, document flights, grid selection, home transitions, carousel settling and island width also respond during active motion. |

## Timing and ownership

Shared feedback uses 160ms, text changes 200ms, disclosures 240ms and layout movement 320ms. Folder extraction and document fusion retain their established physical sequence. The upload feedback and success confirmation retain their intentional display durations; neither delays scan submission.

Animation owners are separated by purpose. Card layout motion owns card transforms, while the shared entrance hook handles newly mounted section elements. Selection backgrounds move independently of labels. Pointer press feedback uses the CSS `translate` property so it does not overwrite GSAP positioning transforms. Comparison dragging remains directly connected to the input value.

The document now feeds progressively through the island's lower edge, retaining its white paper, logo, text, border and corners. This replaces the earlier black material sweep described in `home-redesign.md`. After approach, its scale stays fixed while a 620ms insertion moves the sheet behind the viewport clip; it no longer collapses into a thin black shape. Release reverses the same timeline, progressively revealing the intact sheet before restoring its native size and shadow. Reduced motion and cancellation retain their existing behavior.

General headings animate whole words, preserving the browser's Arabic shaping. Only the fixed Latin brand name uses separate letters. Vehicle names, registration values and financial amounts retain native text proportions and accessible text.

## Verification

Verification passed: `npm test` (75 tests across 15 files), `npm run build`, and `git diff --check`. Browser automation requires the user's permission and was not used for this implementation.

New unit coverage exercises immediate scan reads alongside pending presentation, early API rejection, document completion/cancellation, loading and decoding both comparison images, cancelling superseded loads and reduced-motion listener cleanup. Existing tests continue to cover folder fitting, reversible fusion, swipe interruption, visible-folder actions, lifecycle safety and API behavior.

Frame rate and device-specific rendering need the manual checks below. Transform-heavy carousel rendering and SVG surface resizing have not been benchmarked; keep further performance changes tied to an actual profile.

## Manual test checklist

- [ ] Check desktop, tablet, 320px/390px phones and landscape, including safe areas.
- [ ] Open a dialog and close it through the close button, Escape and backdrop. Confirm a visible exit, restored scrolling and focus on the opener.
- [ ] Close a dialog immediately after opening and try repeated dismissal. Confirm one close and no remaining backdrop.
- [ ] Open/close/reopen the mobile drawer rapidly. Confirm the scrim fades fully and hidden navigation cannot receive keyboard focus.
- [ ] Change sidebar filters and use keyboard navigation; verify selected backgrounds follow the active item without moving its text.
- [ ] Filter and search while scrolled down. Confirm the page stays in place, old results remain during loading and the final results match the query.
- [ ] Switch dashboard grid/list repeatedly and paginate under slow network conditions. Confirm no stretched cards or unrelated heading replays.
- [ ] Open and close part and financial details rapidly. Confirm reversal, readable long content and chevrons matching the requested state.
- [ ] Resize or rotate while details are moving. Confirm no fixed height or clipped content remains.
- [ ] Save a vehicle and check pending, success and error feedback without shifting the action button.
- [ ] Open the viewer and switch photos/modes under slow loading. Confirm the current pair remains visible until the replacement is ready.
- [ ] Switch images rapidly, including to an unavailable image, then retry. Confirm late requests never overwrite the current request.
- [ ] Drag and keyboard-adjust the comparison split. Switch mode and confirm split retention, image alignment and immediate pointer response.
- [ ] Swipe, interrupt settling, tap the centered folder, click arrows rapidly and browse across collection/page boundaries. Confirm counter and actions match the visible folder.
- [ ] Move the mouse over the carousel and leave it. Confirm gentle tilt, a neutral resting position and crisp opened document text.
- [ ] Run analysis with DevTools Network open. Confirm the status request starts immediately and no duplicate scan POST occurs.
- [ ] Test closed and already-open sheets, carousel and focused search results. Confirm extraction finishes before flight and insertion before browsing unlocks.
- [ ] Watch absorption and release with short and long documents. Confirm the white sheet disappears and reappears progressively at the island's lower edge, without a black sweep, flattening or an abrupt full-sheet appearance.
- [ ] Test a very fast completion, immediate launch rejection, failed job and reconnection. Confirm correct document return and no false success.
- [ ] While Terminé is visible after insertion, browse and open the result. Start another eligible analysis and confirm the older success timer cannot reset it.
- [ ] Navigate away during extraction, flight or processing. Confirm temporary sheets and presentation listeners disappear while accepted backend work remains available.
- [ ] Watch scan-stage and photo-progress updates, then completion. Confirm values match responses and the outgoing progress panel collapses cleanly.
- [ ] Check synchronization/action errors appearing and clearing. Confirm layout movement, readable messages and no focusable controls during exit.
- [ ] Use Back/Forward across home, search, dashboard and dossiers. Confirm selection, scroll restoration and route entrances.
- [ ] Enable reduced motion before loading and during an active dialog, disclosure, swipe, document flight and island resize. Confirm immediate, usable end states.
- [ ] Check long French text, Arabic vehicle values, mixed registrations, normal/200% zoom and keyboard focus.
- [ ] Profile carousel gestures and island resizing manually on a slower device before claiming a frame-rate improvement.

## Suggested commits

- `feat(motion): smooth navigation, controls and result disclosures`
- `fix(home): start analysis alongside synchronized document motion`
- `fix(viewer): retain decoded comparisons across photo and mode changes`
- `test(motion): cover concurrent analysis, image cancellation and reduced motion`
