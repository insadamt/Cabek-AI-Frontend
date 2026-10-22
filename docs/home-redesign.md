# Folder home

The vehicle sheet keeps the same layout dimensions throughout opening and closing. The animation measures a closed scale that fits its rotated bottom edge inside the pocket, then restores native scale during extraction. Phone and landscape viewport limits apply in both states, with vertical scrolling for longer content. Avoid state-dependent height limits: they trigger resize observers during extraction and cause jumps in the timeline.

Apply the fitted transform before constructing the GSAP timeline. A set inside a paused timeline is reverted at time zero, restoring the original full-size sheet on initial load and after closing. Regression tests exercise the real GSAP timeline without a browser for initial fit, return, and resizing.

Responsive pocket manual checks:

- [ ] At 320px, 390px, tablet, and desktop widths, verify the closed sheet never protrudes below the folder.
- [ ] Open a sheet with long or missing vehicle values and verify all fields remain accessible.
- [ ] Resize or rotate with the sheet open, then close it; verify it returns inside the pocket.
- [ ] Check hover, interrupted opening/closing, and reduced motion.

Suggested commit: `fix(home): keep closed vehicle sheets inside responsive folders`

The home fills the viewport with glass dossier folders. The centered, settled folder accepts hover, clicks, taps, and keyboard focus. Tapping the nearest-center folder while motion is settling stops on that folder and opens its sheet. Side folders are inert previews; swipes and arrows bring them into the center. Hovering the selected folder opens its pocket and reveals the top of a paper vehicle sheet. Clicking, tapping, or activating the folder with Enter/Space lifts that sheet above the front face. It shows marque, modèle, immatriculation, year, photo count, status, and the dossier reference from the existing list response. Missing vehicle fields use explicit “Non renseigné(e)” labels. The paper stays out while interacting with it or its folder. Clicking outside, pressing Escape, or switching folders returns it to the pocket.

The pocket opening changes shape on hover while its bottom contour stays fixed against the rear face. Extraction first lifts the paper clear of the pocket, moves it in front of the cover, and then lowers it into a readable position overlapping the folder. Closing reverses that same persistent timeline: the paper rises from its front position, changes layers at the pocket mouth, then slides inside. Interrupting a return plays forward from its current progress. The pocket stays open until the reverse finishes. The timeline remeasures on paper, folder, and viewport resizing. The folder keeps the same position and size throughout opening and return. Reduced motion jumps directly to the requested end state. Closed sheets are hidden from assistive technology, and the folder button exposes its expanded state. The home never fetches image previews or full dossier results; photographs remain in the dossier comparison viewer.

Dragging moves the folder track directly with the pointer. Long drags can cross several folders, and release velocity adds a bounded amount of momentum before the track settles. A new drag can interrupt settling. The counter follows the folder nearest the center during dragging and settling, including wraparound and API page boundaries; URL selection commits when motion settles. The collection loops in both directions. Neighboring API pages are prefetched, and the current window stays mounted while crossing a page boundary. If a neighbor request fails, the current page remains usable and selecting the missing page uses the normal loading/retry path.

Arrow buttons and keyboard arrows use the same animated track and easing as drag release. Repeated arrow clicks retarget the animation while preserving every requested step. Reduced motion skips gesture settling animations.

On phones, folders are larger and flatter, with 14px vehicle values, 44–48px touch controls, outside-tap dismissal and safe-area spacing. Previous/next arrows sit below the content. Folder spacing and drag distance share a responsive spacing ratio. Long documents scroll vertically without triggering carousel settling; horizontal swipes still browse folders. Landscape uses reduced document spacing and its own placement.

Folder selection is preserved in the `slide` URL parameter without adding a history entry for every movement. The small arrow opens the selected dossier, and Back restores its selection.

## Manual test checklist

- [ ] On desktop, compare the lower outline closed, hovered, and pressed; it should remain a single edge with no dark strip or separate rear corner.
- [ ] Hover or tap either side folder: it should remain closed and should not change selection.
- [ ] Swipe starting over a side preview: browsing should still work.
- [ ] Hover the centered folder after movement settles: its mouth opens, but the paper stays inside.
- [ ] Click or tap it: the paper clears the pocket, then rests visibly in front of the cover with all details readable.
- [ ] Click the paper or folder again: the paper stays out.
- [ ] Click outside or press Escape: closing follows the opening path in exact reverse, including the layer change at the mouth.
- [ ] Switch folders: the paper returns without the folder changing height or size.
- [ ] Reopen during return: the same animation should change direction without restarting or changing layers early.
- [ ] Use Enter/Space on the folder and verify its expanded state.
- [ ] Verify missing fields and long vehicle names stay readable.
- [ ] Confirm the document stays below the header on desktop, 320px/390px phones, and landscape.
- [ ] On a phone, check readable details, outside-tap dismissal and the bottom navigation hit areas.
- [ ] Scroll a long document vertically: it should remain open; swipe horizontally to browse.
- [ ] Rotate the phone while a document is open or returning; verify its position and layer.
- [ ] Verify safe-area spacing on devices with a bottom home indicator.
- [ ] Confirm opening the paper sends no image-preview or result requests.
- [ ] Drag slowly in either direction; folders should follow the pointer immediately.
- [ ] Make a long drag across two or more folders, then release; the track should settle smoothly.
- [ ] Interrupt a settling swipe with a new drag; check for a jump or lost gesture.
- [ ] Loop past the first and last dossiers in both directions.
- [ ] With more than 12 dossiers, swipe across API page boundaries and check the neighboring folders remain visible.
- [ ] On a phone, swipe folders horizontally and open a dossier using its arrow.
- [ ] Verify both arrow buttons move the track smoothly; click rapidly and confirm every step is retained.
- [ ] Verify keyboard navigation, visible focus, and reduced motion.
- [ ] Open a dossier, verify its photo comparison still works, return with Back, and confirm the selection is retained.
- [ ] Check desktop, tablet, portrait phone, and landscape phone for page overflow.

## Suggested commits

- `feat(home): add continuous momentum swiping to dossier folders`
- `fix(home): connect glass folder faces along a shared bottom fold`

- `fix(home): reverse document extraction on close`
- `fix(home): improve mobile folder readability and touch navigation`

## Vehicle identity sheet redesign

The extracted sheet uses a Cabek company-logo/reference header, a prominent vehicle make and model, year and scan status, a softly inset registration block, and a photo-count footer. There is no “Ouvrir le dossier” link inside the sheet; the existing carousel navigation remains available. Missing vehicle details retain explicit fallback labels. There is no close button inside the sheet; clicking outside, pressing Escape, or browsing folders dismisses it.

The sheet remains live HTML text and CSS at the display’s native resolution. Its resting transform uses scale 1 with no rotation, and the final animation disables forced 3D compositing to avoid unnecessarily rasterizing the text. Visual sharpness still needs verification on target browsers and displays.

### Redesign manual checks

- [ ] Open the sheet on desktop and mobile; confirm model, registration, year, status, and photo count are readable.
- [ ] Check sharpness at normal browser zoom and 200% zoom on a high-density display.
- [ ] Confirm there is no dossier link inside the sheet and the external dossier navigation still works.
- [ ] Verify long vehicle names, long references, mixed Arabic/Latin registration, missing fields, and zero photos.
- [ ] Close by clicking outside and pressing Escape; reopen during return and switch folders.
- [ ] Check portrait and landscape scrolling, keyboard focus, and reduced motion.

Suggested commit: `feat(home): redesign vehicle sheet with crisp native text`

### Document styling and project conventions

The vehicle document keeps its existing information layout. Use the supplied blue Cabek company logo only inside this document, with a transparent background. The app’s existing branding stays unchanged; the company logo and app wordmark serve different purposes.

Use colors to communicate information throughout the project. Shared status styles use slate for not analyzed, amber for queued, blue for processing, green for completed, and red for failed. Keep visible status text so meaning does not depend on color alone. Decorative surfaces remain neutral.

The sheet uses an opaque white surface, a soft registration inset, and no close button. Outside press, Escape, and folder navigation still dismiss it. The active folder flattens while its pocket is open and bypasses parent blur/drop-shadow filters; the document’s final translation uses whole pixels and scale 1. Browser and device verification is still required for text sharpness.

- [ ] Confirm the company logo has no white background and appears only in the vehicle document; app branding stays unchanged.
- [ ] Check every status color in the sheet and dossier list.
- [ ] Check text sharpness on desktop and mobile at normal and 200% zoom.
- [ ] Confirm no X button or dossier link appears in the sheet.
- [ ] Verify outside press, Escape, folder switching, and interrupted return animations.
- [ ] Check long references, mixed Arabic/Latin registration, phone portrait/landscape, and reduced motion.

Suggested commits:

- `fix(home): sharpen vehicle sheet and use document-only company branding`
- `style(status): share semantic status colors across the app`

### Compact sheet and live counter

The vehicle sheet uses smaller outer padding, a 40px logo area, shorter section gaps, and a shallower registration field. Information order, semantic status colors, and document-only company branding stay unchanged.

- [ ] Open the compact sheet on desktop and phone; verify all fields fit and long values wrap.
- [ ] Slowly drag halfway toward the next folder; the counter updates before release.
- [ ] Drag back toward the original folder and confirm the counter follows it.
- [ ] Swipe across several folders, both collection ends, and API page boundaries.
- [ ] Check momentum, interrupted settling, rapid arrow clicks, and keyboard navigation; the number must match the centered folder when stopped.

Suggested commits:

- `style(home): compact the vehicle document spacing`
- `fix(home): update dossier counter during swipe motion`

### Opening a dossier during a swipe

The open-dossier link resolves the same nearest-center position as the live counter, including looping and prefetched page indices. Activating it stops carousel motion and commits that visible selection before navigation, so Back restores the opened folder. If the visible dossier is outside the loaded window, the link is unavailable rather than opening the previous selection. Modified clicks retain native link behavior.

- [ ] Swipe quickly, immediately click the open arrow before settling, and confirm the opened dossier matches the counter.
- [ ] Repeat in both directions, across first/last and API page boundaries.
- [ ] Return with Back and confirm the opened folder is selected.
- [ ] Verify rapid arrow navigation followed immediately by opening a dossier.
- [ ] Verify Ctrl/Cmd-click opens the link's visible dossier in a new tab.
- [ ] If a neighboring page fails, confirm an unavailable visible dossier cannot open the swipe's starting dossier.

Suggested commit: `fix(home): open the visible dossier during swipe settling`

### Folder tap during settling

A new pointer press interrupts the settling animation. A following tap now commits the nearest-center position and opens that folder’s sheet, rather than settling back to the swipe’s starting selection. Gesture intent uses movement since the new pointer press, independently of the interrupted track offset; small finger jitter remains a tap. The resulting click is consumed to prevent a second activation of the previous folder. A tap outside the nearest folder does not open a sheet.

- [ ] Swipe quickly and tap the centered folder before motion finishes; verify its own vehicle sheet opens.
- [ ] Repeat backward, across the collection seam, and across a page boundary.
- [ ] Repeat with a slight finger movement during the tap.
- [ ] Start another horizontal swipe during settling; verify it continues browsing without opening a sheet.
- [ ] Tap outside the folder during settling; verify no sheet opens.

Suggested commit: `fix(home): open the nearest folder when a tap interrupts swiping`

### Bottom search and folder action

The bottom toolbar searches the dossier list on submission using the existing search query. Its action follows the nearest visible folder, including while settling: **Analyser** for not-analyzed or failed folders, **Ouvrir** for completed folders, and **Suivre** for queued/processing folders. Analysis opens the existing dossier review screen before launch. Modified clicks retain native link behavior. Action-label changes animate briefly; reduced motion disables the animation.

Manual checks:

- [ ] Browse each status and verify the action label and destination match the visible folder.
- [ ] Swipe, activate the action before settling, then go Back; verify the same folder is selected.
- [ ] Search by ID, make, model, and registration; verify the list receives the query.
- [ ] Use arrow keys inside the search input; verify they move the caret without browsing folders.
- [ ] Check Tab, Enter, focus visibility, and Ctrl/Cmd-click on the action.
- [ ] Check 320px phone, desktop, landscape, safe-area spacing, and reduced motion.

Suggested commit: `feat(home): add bottom search and status-aware folder actions`

### Folder search grid

Submitting the home search now opens an in-home folder grid rather than the dossier table. An empty search shows all folders. A single matching folder is centered vertically and horizontally. Larger collections use 24-folder pages; the search stays available below the grid. Selecting a folder opens its dossier. The Analyser action uses a green background with a darker hover state.

Manual checks:

- [ ] Submit an empty search and verify folders appear in a responsive grid.
- [ ] Search for one exact dossier and verify its folder is centered.
- [ ] Search for multiple matches and no matches; verify the results and empty message.
- [ ] Search again from the grid, browse pages, open a folder, and use Back.
- [ ] Verify Analyser is green with readable text and keyboard focus.
- [ ] Check phone, desktop, and landscape scrolling and search access.

Suggested commit: `feat(home): display folder search results in a centered responsive grid`

### In-place search motion and soft analysis color

The home frame stays mounted while switching between carousel and search results. Search changes animate within the home content area using browser view transitions when supported. Existing results stay visible while the next response loads, then retained folders move to their new positions, new folders fade in, and removed folders fade out as inert copies. Reduced motion disables these effects. Analyser uses a saturated emerald green surface (#0d8a63) with white text and a deeper green hover (#087352).

Manual checks:

- [ ] Search from the carousel and return; verify the header stays in place and content transitions smoothly.
- [ ] Change a broad query to a single match; verify the remaining folder moves to the center and others fade out.
- [ ] Try no matches, clear the query, and change result pages.
- [ ] Change searches quickly and navigate away during animation; verify no lingering folder copies.
- [ ] Check emerald green default/hover, keyboard focus, mobile layout, and reduced motion.

Suggested commit: `feat(home): animate in-place folder search and soften analyse button`

### Lime action and morphing search controls

Analyser now uses the requested #a7e36f with dark text and a #96d45d hover. The home toolbar places the search field and Ouvrir/Analyser/Suivre side by side, with search on the left. In search mode an Effacer button occupies the primary action position; it clears the search and returns to the carousel. Shared view-transition names morph the search field's position and the primary action into Effacer and back, with reduced-motion support. Browsers without view transitions switch immediately. Search mode uses the same horizontal layout with Effacer on the right. Carousel space accounts for the single-row controls.

Manual checks:

- [ ] Verify the lime action and its hover/text contrast.
- [ ] Search from the home toolbar: the field moves smoothly and the action morphs into Effacer.
- [ ] Activate Effacer from single, multiple, empty, and loading results; verify the carousel returns and the search clears.
- [ ] Check repeated search/clear, keyboard activation, mobile/landscape spacing, and reduced motion.

Suggested commit: `feat(home): morph search controls and add clear action`

### Reversible GSAP search and matching titles

Home search transitions now use GSAP and Flip rather than browser view transitions. Shared Flip IDs morph the search and primary controls. Effacer reverses the content movement (search leaves downward and the carousel returns from above). The carousel remains mounted while hidden so clearing does not wait for a new folder fetch. Reduced motion switches immediately.

The title below each search folder shows whichever identity fields contain the query: registration, vehicle make/model, or dossier reference. All matching fields appear when the query is ambiguous; every matching occurrence is highlighted without changing the original text casing. Empty searches use the vehicle identity.

Manual checks:

- [ ] Search then clear: verify the control morph and content movement run in opposite directions.
- [ ] Clear while loading and repeatedly search/clear; verify the carousel returns without a blank loading frame.
- [ ] Search matricule, make, model, and reference; verify the displayed title and highlighted substring.
- [ ] Check mixed Arabic/Latin registration, ambiguous matches, phone layout, keyboard, and reduced motion.

Suggested commit: `feat(home): reverse GSAP search transitions and highlight matching identity fields`

### Clear without a white flash

The carousel search form resets after its query is captured for submission. Because the carousel stays mounted behind the results, this prevents Effacer from revealing the previous query in its input.

Search and Clear commit the destination immediately and run the GSAP Flip control movement in the same frame. The home container stays fully opaque; only the folder area gets a subtle entrance. Clear therefore moves the controls directly back to their carousel position without fading the page out first. Interrupted transitions finish before the next layout snapshot.

- [ ] Search and Clear on desktop and phone: verify both controls move together without a white frame.
- [ ] Clear repeatedly during movement and while search is loading; verify no jumps or lingering transforms.
- [ ] Verify reduced motion skips movement.

Suggested commit: `fix(home): remove page flash during search and clear morphs`

### Mobile navigation above search

On phones the previous/next controls and counter sit near the bottom, above the search/action row. Portrait arrows sit 104px above the bottom safe area, with the counter centered between them, so navigation stays within easy reach regardless of folder or header position. Search remains near the bottom safe area. Landscape places navigation in a separate row above search.

- [ ] At 320px and 390px widths, verify arrows/counter sit below the folder and above search without overlap.
- [ ] Check short phones, landscape, opening the sheet, swiping, and search/Clear morphs.

Suggested commit: `style(home): place mobile navigation below folders above search`

### Focus a folder from search

Selecting a grid folder stays in the current search. GSAP Flip moves the chosen folder into a single centered view and hides its neighbors. Once it settles, the existing pocket/document timeline reveals its sheet. Search collapses into Retour and Effacer morphs into the selected status action: Analyser for not-analyzed/failed, Ouvrir for completed, Suivre for active scans. Analysis still opens the existing review screen before launch.

Retour and Escape first reverse document extraction, then return the folder to its grid cell and restore search controls, scroll position, and keyboard focus. Transitional controls prevent repeated selection/back actions during layout movement. Reduced motion skips layout movement. Result rearrangement pauses while a folder is focused so it does not compete with the selection timeline.

Manual checks:

- [ ] Select a folder from the first row and from a scrolled grid: verify it moves into view before the sheet opens.
- [ ] Verify only the selected folder stays visible, and the company sheet remains readable on desktop/phone/landscape.
- [ ] Verify search morphs into Retour and Effacer becomes Analyser/Ouvrir/Suivre for each status.
- [ ] Use Retour/Escape: paper closes first, folder returns to its cell, neighbors appear, and original search/scroll/focus return.
- [ ] Select/return repeatedly, press Back during paper extraction, and try keyboard-only and reduced motion.
- [ ] Activate the selected action and verify the correct dossier opens without starting an analysis automatically.

Suggested commit: `feat(home): focus grid folders with reversible document and control animations`

### Preserve proportions during folder selection

Grid selection moves and uniformly scales the folder artwork together over 420ms. The previous translation-only implementation changed the folder's size immediately before movement, causing a visible jump in both directions. The focused folder shares the home carousel's responsive width, capped by the available search area. Desktop, phone and landscape sizes follow the same shared CSS property and update on resize.

The real folder temporarily uses fixed positioning while its preview reserves the destination space. This keeps the return path above the scrollable grid's clipping boundary without copying interactive elements or SVG identifiers. Temporary positioning and transforms clear at completion. Complete neighboring cards and the selected card's metadata fade in during the last 180ms of return. Resizing or enabling reduced motion settles the current layout movement. Return restores the actual selected folder button's keyboard focus, including when selection started with a pointer.

Search and Retour now share one persistent, opaque surface. Its width collapses into the button while the magnifier's SVG paths interpolate into a back arrow. Query and Retour text share the same left origin and exchange locally, with the submit icon disappearing inside the collapsing field. Returning expands the same control and reverses the icon/text changes. The query input stays mounted to preserve entered text; inactive form/button layers are inert and hidden from assistive technology. There is no whole-control fade or removal between states. All destination bounds are captured before controls leave flex flow; a reserved 50px control row prevents layout collapse. Control text and icons remain unscaled. Temporary positioning and dimensions clear when movement finishes. Neighbors fade before focus and fade back in on return. Paper extraction still starts after the folder settles and closes before return.

- [ ] Select and return from several grid positions: verify the folder moves and grows/shrinks together, without a size jump or distorted proportions.
- [ ] Select from a scrolled grid, then return: verify the entire travel path stays visible and all neighboring titles/status badges fade in together.
- [ ] Watch Search → Retour and Retour → Search: verify width changes smoothly with no overlapping controls, row jump, wrapped labels or stretched icons. Repeat with each action status, pagination and reduced motion.
- [ ] Verify the search surface stays visible throughout collapse, the magnifier becomes the back arrow, and query text transitions into Retour at the same left edge. Type a query before selection and confirm it survives return. Tab must skip the inactive input/button layer.
- [ ] Compare a selected search folder with the home folder on desktop, tablet, phone portrait and landscape; verify matching size where space allows.
- [ ] Resize with a search folder selected, then use Retour/Escape; verify responsive sizing, original grid thumbnails, scroll position and focus.
- [ ] Check short queries, long registration titles, scroll restoration, mobile rotation, and reduced motion.

Verification: `npm test` passes (96 tests across 17 files), `npm run build` passes. Regression checks cover source/destination geometry in both directions, proportional scale, reduced motion, style cleanup and delayed neighboring card appearance. Browser/device review remains manual; Playwright was not run.

Suggested commit: `fix(home): smooth grid focus transitions in both directions`

### Analysis activity island and document journey

Analyser now starts analysis in place from the carousel or a focused search folder. The action shows an upward upload animation while the vehicle sheet lifts out of its pocket. A temporary, inaccessible copy travels above the workspace clipping, shrinks into the Cabek AI island, and disappears with a small elastic response. The original sheet remains hidden and its folder empty while processing. On success, the island releases the document, it returns along the same central route and slides into the pocket. The action displays a drawn check and Terminé for 1.4 seconds before becoming Ouvrir. The island then returns to its brand state. An already-open sheet stays open during transmission.

The black island attaches to the top frame with concave shoulders and rounded lower corners. It keeps a fixed 44px height in every state; only its width follows the content with GSAP. It displays the dossier reference, photograph counts, an overlapping fade between operation labels, independently morphing pink/orange/purple/cyan pixels, server ETA when available, and a photo progress track. The elapsed timer interpolates between server samples without moving backward. Photograph counts, stage, ETA and completion remain server-sourced; the interface never invents analysis progress.

Before starting, the client reads current status so a stale folder cannot resubmit a completed scan. Queued/processing dossiers use the same island to follow their existing work. Following a scan does not automatically retry a failure. A lost POST response or scan conflict is recovered through GET requests; the POST is never automatically repeated. Poll failures keep the document in the island and retry with backoff. Explicit failures return the sheet and show an error with a dossier link, without showing success. Navigation away cancels presentation and requests; accepted backend work remains independent. Preview mode stays read-only and returns the existing API-connection message instead of simulating completion.

Folder gestures, browsing, search, Back and repeated action clicks are suspended during the document journey to keep its destination stable. Reduced motion skips flight, morphing and decorative loops while retaining progress and the brief success confirmation. Flight copies and animation listeners are removed on completion or unmount.

Manual checks (browser/device verification still required):

- [ ] In the carousel, activate Analyser on a closed folder; verify upward button feedback, full sheet extraction, shrink into the island, and an empty folder during processing.
- [ ] Repeat with an already-open sheet and with a focused folder from search; verify the sheet does not close and reopen before its flight.
- [ ] Verify the island joins the top frame without a seam and keeps its height while its width resizes smoothly, overlaps old/new labels, and continuously morphs the colored pixels.
- [ ] Check the dossier reference, photo counts and ETA against actual responses. Confirm the elapsed timer keeps ticking through polls and minute boundaries without moving backward.
- [ ] Let analysis complete; verify the island releases the sheet, it returns inside the same pocket, Terminé appears briefly, and Ouvrir opens the saved result.
- [ ] Double-click Analyser and try arrows, swipes, search, Retour and Escape during processing; verify no duplicate launch or displaced destination.
- [ ] Activate the action while carousel motion is settling; verify the nearest visible dossier is the one submitted and restored by Back.
- [ ] Use Suivre on queued/processing dossiers; verify no POST is made, including if the job has failed since the folder summary loaded.
- [ ] Simulate a lost POST response or a 409 conflict; verify status reads recover without another POST.
- [ ] Disconnect during polling, then reconnect; verify a reconnection message, continued elapsed time, and recovery without a new scan.
- [ ] Test explicit launch errors, failed scans, zero photos and read-only preview; verify document return, clear error text and no false success.
- [ ] Navigate away mid-flight and during processing; verify no floating sheet remains and an accepted scan can still be followed from its dossier.
- [ ] Test 320px/390px phones, tablet, desktop, landscape, resizing, long references, keyboard focus and reduced motion.

Automated verification: the lifecycle tests cover one-time submission, existing jobs/completed results, conflicting/lost launch responses, unconfirmed requests, reconnect backoff, failures and cancellation. Existing carousel, grid, extraction and API tests remain applicable. Browser automation was not run.

Suggested commits:

- `feat(home): animate analysis through the Cabek AI activity island`
- `test(home): cover scan recovery and duplicate launch protection`


### Fixed-height island and reversible document fusion

The activity island attaches to the frame through curved shoulders, with rounded lower corners and a soft shadow. Its height stays at 44px for branding, transmission, activity, success, reconnection and errors. A single row holds the pixels/check, activity, compact metadata and a fixed-width elapsed timer. Reference, photo count and server ETA alternate in the metadata slot. On phones, the activity, photo count and ETA share the primary text slot. Error details are available through the title and accessible dossier link; all visible text stays on one line. A thin progress track sits inside the lower edge without adding another text row. Header space stays constant between states, including mobile, so width changes do not push navigation or folders.

One reversible GSAP timeline controls the sheet's travel and material. During approach, a soft dark front sweeps downward from its leading edge, covering the actual logo and text. Corners round and the shadow melts away as the sheet becomes the island's exact black. A viewport clip at the island's lower edge hides the final merge, including very tall documents, without an opacity fade. Release reverses that same timeline: a black shape emerges, white paper is revealed from the bottom upward, and normal corners, shadow and native dimensions return before pocket insertion. Temporary copies remain inaccessible and are removed on completion or cancellation.

Contact briefly deforms only the island's surface horizontally; its height and text stay steady. The pixels gather on absorption and transition into a drawn check on success. The button's upward upload feedback shares the transmission timing. Reduced motion skips document travel, surface reactions, text movement and pixel loops while preserving real progress and the success hold.

Manual test checklist:

- [ ] Check the connected shoulders and soft shadow; verify the island is exactly 44px tall and at the same vertical position in every state, including errors.
- [ ] Watch absorption slowly: darkness should travel from top to bottom through logo/text, corners soften, shadow disappears, and no detached black fragment remains below the island.
- [ ] Watch release: the black sheet emerges first, white returns from the bottom upward, and the sheet regains its normal material and size before entering the folder.
- [ ] Test closed and already-open carousel sheets and focused search folders; verify no duplicate paper or visible return seam.
- [ ] Verify width changes, photo/ETA crossfades, pixel gathering, drawn checks, stable timer spacing and Terminé → Ouvrir.
- [ ] Check long references, long error text and the dossier link without wrapping or changing height.
- [ ] Check 320px/390px phones, desktop, tablet, landscape, safe areas and resizing. Navigation, sheet and bottom controls must remain reachable without overlap.
- [ ] Navigate away during absorption/release and confirm no temporary document remains.
- [ ] Check reduced motion, keyboard navigation, visible focus, reconnect recovery and existing scan behavior.

Verification: real GSAP timeline tests exercise complete absorption for 200px, 400px and 1000px sheets, progressive material reversal, and exact restoration of the document's position, corners and shadow. These tests run without a browser. Visual browser/device review remains manual; Playwright was not run.

Suggested commit: `feat(home): refine floating island and document fusion motion`


### Attached island with more room between elements

The island rejoins the top border through 14px concave shoulders and keeps the fixed 44px height, current material-fusion timeline, single-line activity layout and width-only resizing. The body has 18px lower corners, a softer layered shadow and a subtle lower edge. The surface and shoulders share one animated element so absorption/release feedback does not separate their connection. The document still measures the island's actual lower edge for its merge and return.

Desktop horizontal padding increases to 28px and the minimum activity content width to 260px. The single activity row uses 12px gaps between its elements. Metadata gets a muted capsule, and the fixed-width timer gains a light separator with extra inset. Phone layouts use 22px padding and 9px status gaps; shoulder gutters keep the connected shape inside the frame. The idle wordmark also gains more horizontal room. Width measurements read the same CSS spacing variables as the layout so the animated surface includes the extra padding.

Manual test checklist:

- [ ] Confirm both shoulders join the top frame in idle, processing, error and success states, including while width and contact animations run.
- [ ] Check the spacing between the pixel symbol, label, metadata and timer; the island must stay 44px tall without clipping.
- [ ] Verify long references, photo/ETA changes, long errors, metadata capsule and timer separator on 320px/390px phones and desktop.
- [ ] Run analysis from carousel and focused search folders; confirm dark absorption, reverse reveal and Terminé → Ouvrir still follow the same document.
- [ ] Check navigation spacing, landscape, reduced motion and visible keyboard focus. Browser/device visual review remains manual; Playwright was not run.

Suggested commit: `style(home): restore attached island and refine activity spacing`

### Wider attached island

The idle island increases from 240px to 300px. Desktop activity content increases from 260px to 320px, making the active surface at least 376px wide including padding. Narrow desktop headers retain the previous activity minimum to keep shoulders clear of navigation; phones remain limited by their existing screen gutters. Height stays at 44px.

Manual checks:

- [ ] Verify the wider idle and active island on desktop, including smooth transitions between them.
- [ ] Check header navigation at 651–760px and screen edges at 320px/390px.
- [ ] Confirm absorption, release and status text still align with the island.

Suggested commit: `style(home): widen the attached activity island`

### Continuous frame-to-island contour

The island surface now uses one SVG contour for the top connection, concave shoulders and rounded body. Its fill inherits the frame's ink color, and its top edge overlaps the clipping boundary by one pixel to avoid an antialiased hairline. The island starts at the frame's inner top edge instead of clipping separate shoulder gradients with a negative offset. Its shadow follows the full outline, including during contact feedback, rather than outlining a rectangular body beneath separate shoulders.

A resize observer updates the contour from the actual animated width without retargeting the width animation. The wider dimensions, 44px height, spacing and document fusion remain unchanged.

Manual checks:

- [ ] Check both joins against the top border: no visible gap, straight cut or detached shadow at normal and 200% zoom.
- [ ] Verify the contour remains continuous during idle/activity width changes and absorption/release pulses.
- [ ] Check desktop and 320px/390px phones, including the different frame border widths.
- [ ] Confirm the document still merges at the lower edge and returns to its folder. Visual browser review remains manual; Playwright was not run.

Suggested commit: `fix(home): join island and frame with a continuous contour`


### Compact single-line island

The attached island is 44px high in every state. The continuous surface uses smaller 14px shoulders and 18px lower corners with a lighter shadow. Branding, activity text, status symbols and the internal progress track fit the shorter profile. All activity is one horizontal row; no dossier/status rows are stacked.

Desktop shows pixels → short operation label → rotating dossier/photo/ETA detail → fixed-width timer. A compact arrow opens the dossier when an error needs attention, with the full error in its title and accessible label. Narrow desktop headers reserve room for navigation. On phones, the separate detail capsule is hidden and the primary text alternates between activity, photograph count and server ETA every four seconds during processing. Stage changes restore the activity label immediately. Short labels, ellipsis and a stable timer width keep the row from wrapping. Progress remains server-sourced.

The document flight already measures the live lower edge, so absorption and reverse reveal follow the new height. Header and folder spacing follow the same height variable. Reduced motion, the success hold and Terminé → Ouvrir remain supported.

Manual test checklist:

- [ ] Confirm the island stays 44px tall from branding through upload, processing, failure and success.
- [ ] Verify all text stays on one row; check pixels, status, metadata, timer, progress track and error arrow for clipping.
- [ ] On 320px/390px phones, wait for photo-count/ETA rotation and verify stage changes restore the activity immediately.
- [ ] Check desktop and 651–900px header navigation, long references, long errors and keyboard access to the error link.
- [ ] Run absorption/release from carousel and focused search folders; confirm contact aligns with the shorter surface and the paper returns normally.
- [ ] Check continuous frame joins, reduced motion, resizing and landscape. Visual browser/device review remains manual; Playwright was not run.

Suggested commit: `style(home): compact the activity island into a single row`

### Shared application motion

Scan reads and the guarded launch now begin alongside the document presentation. Extraction and insertion wait for actual document completion events. Browsing unlocks once insertion finishes, while the brief success confirmation remains visible. An older success timer cannot reset a newer session. The compact 44px island and current single-line layout remain intact.

Carousel hover tilt updates CSS directly, settling duration follows the remaining distance, and unchanged search folders stay still during data updates. Shared text/control feedback, dialogs, result disclosures and comparison loading are documented with the full manual checklist in [motion-enhancements.md](motion-enhancements.md).

### Registration plates on folder covers

Folder covers display the vehicle's existing matricule in a light plate with a dark outline and divided MA, serial, letter and region sections, inspired by the supplied reference. A value such as `0000-a-00` keeps its leading zeroes. The series cell stacks the Arabic letter above its uppercase Latin equivalent with a horizontal divider, matching the reference's `ب / B` arrangement. The fifteen series correspondences follow the [table reported by Autonews](https://autonews.ma/actualite-auto/actualite-nationale/25193-plaques-dimmatriculation-au-maroc-ce-qui-change), including `أ / A`, `و / E` and `ص / C`. Either script can be supplied; unsupported letters remain unchanged. Existing one-to-five-digit serials and one-to-two-digit regions are preserved. Hyphens, middle dots and vertical bars are recognized separators. Other formats appear intact in one value area; missing values show “Non renseignée”. This is presentation only, with no new API request or registration validation rule. The dossier reference stays below the plate, and the folder button's accessible name includes the matricule.

The plate and reference share a front-markings layer inside the cover. The same GSAP timeline drives the pocket outline and the markings' compression around the fixed bottom fold, including interrupted transitions and reduced-motion end states. A shallow contact shadow helps the plate feel mounted on the cover.

The Arabic series glyph uses a slightly smaller size and 2px of top padding to keep tall marks, including the hamza in `أ`, clear of the plate's upper border.

Validation: production build and targeted formatting check. Browser/device visual review remains manual; Playwright was not run.

Manual test checklist:

- [ ] Check the plate's placement, border, dividers and contrast on desktop, 320px/390px phones and landscape.
- [ ] Verify `0000-a-00`, `12345 · A · 6` and an Arabic-letter registration keep the correct values and cell order.
- [ ] Check `0000-b-00` and `0000-ب-00` both show `ب` above `B` with a divider; check `E / و`, `C / ص` and an unsupported letter.
- [ ] Check missing, unfamiliar and long registration values, along with long dossier references, for clipping or overlap.
- [ ] Open and close folders, switch carousel folders and open a focused search result; confirm the plate follows its cover and does not block controls.
- [ ] Hover, leave, reopen during closing and use reduced motion; confirm the plate and reference follow the front pocket without drifting or exposing another bottom edge.
- [ ] Verify keyboard focus, Enter/Space opening, screen-reader registration text and reduced motion.

Suggested commit: `feat(home): add plate-style matricules to folder covers`

Suggested refinement commit: `feat(home): pair plate letters and attach markings to pocket motion`

### Grid folder focus and return sequence

Selecting a search result pauses grid entrance/rearrangement animations before measuring the folder, fades out neighboring folders, and moves the selected folder to the center before opening its sheet. Returning first stows the sheet, then moves the folder back into the restored grid position and scroll offset. Neighboring cards and the selected card's title/status fade in only after the 420ms travel completes. The grid remains inert through movement and the final 180ms fade so another selection cannot interrupt the sequence. Reduced motion skips these durations.

Validation: `npm test` (92 tests), `npm run build`. Browser automation was not used; visual verification remains manual.

Manual test checklist:

- [ ] Select folders from different grid columns and rows: neighbors disappear, the selected folder moves smoothly to the center, then its sheet opens.
- [ ] Press Retour or Escape: the sheet stows, the folder returns to its original cell, then other folders and metadata fade in without sliding.
- [ ] Scroll down before selecting a folder; verify returning restores its cell and the previous scroll position.
- [ ] Select a folder immediately after search results appear; verify no jump from overlapping entrance animations.
- [ ] Click repeatedly during selection/return; verify no extra selection starts and keyboard focus returns to the selected folder.
- [ ] Repeat on desktop and narrow mobile widths, resize during travel, and enable reduced motion before and during a transition.

Suggested commit: `fix(home): sequence folder focus and grid return animations`

Grid sheets retain their natural width inside the pocket and during extraction. Their lower edge is clipped to the pocket depth instead of uniformly scaling the sheet down to fit the thumbnail. Extraction reveals that edge as the sheet lifts; returning reverses the same clip. This avoids an independent width expansion/collapse when switching between grid and focus sizes. The carousel retains its fitted sheet scale. The extracted grid sheet keeps its full content height, scrolling and shadow.

Manual checks: open and return folders at desktop/mobile sizes, compare the sheet's width with its folder throughout travel, and check long vehicle values, bottom-edge containment, scrolling, interrupted closing and reduced motion.

Suggested commit: `fix(home): keep grid document width stable inside folder pockets`
