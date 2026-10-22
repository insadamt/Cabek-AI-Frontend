# Dossier opening and photo inspection

The details page keeps the folder and metadata at the left and adds photo inspection at the right. The photo-only stage is now extended by the viewport tabs, financial estimates, illustrated damage rows and PDF actions described in [dossier-estimation.md](dossier-estimation.md). Earlier stage notes below document the original photo implementation.

Activating **Ouvrir** starts the saved-result read and image preparation immediately, alongside extracting the vehicle document and sending it into the dynamic island. The island displays real decoded-image counts and a progress line. All original, Pièces and Dommages display previews are loaded and decoded before opening. Every distinct URL starts concurrently, without an application-level request queue. Critical images are excluded entirely.

After every visible preview is ready, the document and a photo stack return together. Up to four cards represent the collection, with a remaining-count badge for larger dossiers. Only prepared originals appear on these decorative cards; other cards remain blank so the animation does not request additional previews. The paper then inserts into the folder using its actual completion event. The folder moves upper left and reveals metadata and inspection. Navigation carries the prepared response so the destination can show the result immediately while normal reads refresh it. The most recently prepared dossier's decoded assets remain referenced and are reused by comparison loading.

There is no minimum loading delay. The island logo transitions over 240ms, document flights use 2× playback (700ms each), and extraction/insertion use 1.5× playback (about 413ms each). The photo stack overlaps the document return rather than adding another serial step. Folder arrival takes 450ms; metadata reveals over 200ms with a 25ms stagger. Ordinary analysis flights and manually opening a home sheet retain their existing timings. Actual network and decoding time can still keep the island loading until all visible previews are ready.

The source section stays inert while opening, repeated activation is ignored, and navigating away or pressing Cancel aborts loading and removes temporary flights. Image/API failure restores the document and exposes Retry/Cancel without opening incomplete details. Reduced motion keeps the same data-readiness rules and skips the travel. Opening a saved result never submits a scan. The existing home analysis behavior and the latest mobile/inline-viewer layout remain in place.

Metadata includes reference, make, model, registration, year, loss date, creation date and photo count, with explicit missing-value fallbacks and bidirectional registration text. The details-page folder remains decorative.

The home frame, activity island and neutral styling are reused. On desktop, the dossier frame occupies one dynamic viewport with no page scroll. On phones (up to 767px wide, and landscape up to 950px wide with height at most 520px), the main content scrolls vertically within the frame. The main grid and comparison image shrink to the available height while their controls retain their own rows. Direct links/reloads use a brief local entrance without needing a source folder. Back/Forward revisits do not reuse stale travel coordinates: the entrance snapshot is removed from history after reading. Reduced motion skips travel and stagger; resizing during the entrance settles the sequence to avoid stale coordinates.

The folder artwork keeps the focused view's native `--home-folder-width` and aspect ratio. A uniform transform scales it into the smaller sidebar slot; the registration plate, label, paper and shadows retain their shared styling and proportions. Resize observation updates the fitting scale without reflowing the artwork contents. Travel also uses a uniform scale to avoid stretching the folder.

During travel, the artwork uses fixed viewport positioning above the workspace so
the sidebar's scrolling overflow cannot clip it. Its empty sidebar slot stays in
layout, keeping metadata and the arrival position stable. On arrival, temporary
positioning and transforms clear together and the artwork resumes its fitted
sidebar scale. Direct links and reduced motion keep the artwork in its slot.

## Photo inspection

After the folder and metadata timeline completes, the right workspace fades in with a 12px upward movement. Hidden controls are inert until the entrance completes. The workspace shell remains mounted while result data loads, so a slow request does not replay the folder animation. Reduced motion removes the reveal transition.

Inspection includes a large original/annotated comparison, Pièces/Dommages controls, a photo counter, previous/next controls, lazy-loaded original-image WebP previews as thumbnails. Comparisons stay inline; the detail page has no fullscreen/enlarge action or image modal. Both comparison images load and decode before the existing crossfade replaces the pair. Image errors retain the existing retry behavior; result errors show a retry notice and retain previously received photos. Empty results and pending analysis have distinct messages.

Changing annotation mode preserves the split. Changing photos resets it to the middle, while selecting the current thumbnail leaves it intact. Arrow keys navigate within the workspace except on the comparison slider, which keeps its native keyboard behavior. A bounded window of thumbnails follows the selected photo. The number of visible thumbnails is measured from the available width, so neither the page nor the thumbnail strip needs scrolling. Previous/next buttons and arrow keys reach photographs outside the visible window.

The folder/metadata and inspection remain side by side on desktop. Phones use a single column with a compact folder beside the vehicle identity, two-column metadata and a full-width comparison below. Long vehicle names and metadata wrap so their complete values are available without tooltips. The comparison has a 4:3 aspect ratio and a 240px minimum height; loading and empty states also retain useful space. The main content scrolls vertically, including in short phone landscape and at enlarged text sizes, while the header stays in its own row. Horizontal slider gestures adjust the split, and vertical gestures may scroll the page. Back, annotation and navigation controls retain at least 44px touch targets. Safe-area padding protects content near device edges. The folder keeps its focused artwork dimensions and scales uniformly into an 88px slot. Desktop short-landscape controls still share rows to reserve height for the image.

## Verification

Run `npm test`, `npm run build` and `git diff --check`. Opening tests cover immediate loading, readiness/insertion gating, fast playback, overlapping return motions, initially closed sheets, repeated activation, cancellation and failed-image recovery. Image tests cover all visible previews, critical-image exclusion, WebP selection, deduplication, concurrent initiation of 90 requests without waiting for completion, actual counts, aborts and decoded-cache reuse; island checks cover real/unknown progress and error actions. Photo rendering checks cover loading, empty/pending/error states, retained photos after refresh failure, single-photo boundaries and the absence of an enlarge action. Separate legacy viewer checks still cover selection restoration/clamping. Browser automation is not used; visual and device behavior still require the manual checks below.

## Manual test checklist

- [ ] Activate Ouvrir: confirm loading begins immediately while the document extracts and enters the dynamic island.
- [ ] With cached images, check the faster motion has no extra waiting pause; the document and photo stack should return together before insertion and folder travel.
- [ ] Throttle the network: confirm the island shows actual visible-preview counts (normally three per photo), excludes critical images, and waits for all requested previews to decode.
- [ ] Switch every photo and annotation mode after arrival; verify prepared images are reused without additional downloads or loading interruptions.
- [ ] Fail an image request: verify the document returns, details stay closed and Retry/Cancel works.
- [ ] Cancel or navigate away during extraction, loading and return; confirm requests stop, temporary overlays disappear and there is no delayed redirect.
- [ ] Repeat from the carousel and focused search results, including a folder whose document is already closed.
- [ ] Confirm the folder arrives in the upper left, followed by metadata appearing beneath it in sequence.
- [ ] Compare the focused and sidebar folders: plate, label, paper and shadows should keep the same proportions, with only overall scale changing.
- [ ] Confirm the right photo workspace appears after folder/metadata entrance, without replaying that entrance when results finish loading.
- [ ] Change photos with thumbnails, buttons and keyboard arrows; confirm the selected thumbnail remains visible and the page does not jump.
- [ ] Drag and keyboard-adjust the comparison slider, switch Pièces/Dommages and confirm split retention. Selecting another photo resets it; selecting the same photo does not.
- [ ] Confirm there is no fullscreen/enlarge button or image modal on the detail page; comparison, modes and photo navigation work inline.
- [ ] Test one photo, no photos, pending/failed analysis, slow network, broken images, rapid mode changes and result refresh failure/retry.
- [ ] Verify desktop retains its viewport layout; phones stack metadata above the full-width photo and scroll vertically without horizontal overflow. Check touch targets and reduced motion.
- [ ] Follow the current estimation and damage checklist in [dossier-estimation.md](dossier-estimation.md).
- [ ] Check every metadata value against the selected dossier; verify long text, missing values, zero photos and Arabic/Latin registration.
- [ ] Click Ouvrir repeatedly throughout opening and confirm only one sequence/navigation occurs.
- [ ] Open during carousel settling and verify the visible folder is used; Back should restore its selection.
- [ ] Use direct links, reload and Back/Forward; confirm a usable page without a stale travel path.
- [ ] Check desktop, tablet, 320px/390px phones and short landscape; verify header spacing, wrapped long metadata, a useful comparison area and no horizontal overflow. On phones verify vertical scrolling works, including starting a vertical gesture over the comparison.
- [ ] Resize/rotate during folder travel and metadata reveal; confirm the final folder and metadata positions are correct.
- [ ] Check keyboard activation, focus visibility, 200% zoom and reduced motion (including changing the preference during animation).
- [ ] Verify home analysis launch/progress still works and opening a saved dossier sends no scan POST.

Suggested commit: `feat(dossier): restore faster island opening with concurrent image loading`

## Mobile detail update

Responsive overrides live in `src/styles/dossier-mobile.css`, after the desktop workspace styles. The detail workspace owns its inline photo selection and no longer opens `ImageViewer`. No browser automation was used for this update.

Suggested commit: `feat(dossier): improve mobile layout and remove photo fullscreen action`

## Compressed display images

The backend contract in `../cabek_ai_global/docs/api.md` provides
`result.photos[].original_preview_url`, `parts_preview_url`,
`damages_preview_url` and `critical_preview_url`. These returned URLs serve
WebP at quality 82 with a longest edge of at most 1600 pixels, without enlarging
small images. `src/lib/photoDisplayUrls.ts` selects these URLs consistently for
opening preparation, photo-stack animation, inline comparison and thumbnails.
Full media fields stay intact; older responses and local illustrations fall back
per image to the existing media URL when a preview field is absent. A failed
preview follows the existing retry flow rather than silently downloading the
full file. URL resolution preserves backend deployment prefixes and development
proxy behavior.

The opening sequence starts all original/Pièces/Dommages previews concurrently
and retains decoded images for reuse by comparison loading. Critical preview
URLs are never requested; thumbnails reuse the prepared original previews.

Manual test checklist:

- [ ] Open a completed dossier with DevTools Network filtered to images; confirm requests use the returned `/preview/…webp` URLs, including the animated cards and thumbnails.
- [ ] Switch every photo and Pièces/Dommages; verify alignment and reuse of prepared previews without additional image requests.
- [ ] Reload the details page directly and verify comparisons and thumbnails still request previews.
- [ ] Check an older response without preview fields and local preview mode; verify the existing images still render.
- [ ] Break a preview request and confirm opening offers Retry/Cancel; restore it and retry.
- [ ] Verify preview paths work behind a deployment prefix and through the development proxy.

Suggested commit: `fix(dossier): use API WebP previews for image display and preloading`


## Opening performance on mobile

The opening loader previously used a six-request queue and included critical
annotations that never appear in inspection. It now starts all original, Pièces
and Dommages previews at once and waits for every image to decode. Critical
images are excluded. Duplicate URLs are requested only once. Cancellation,
failure recovery, progress counts and decoded-image retention still apply.

For 30 photos this starts 90 visible-preview requests instead of 120 requests
including critical images, with no frontend concurrency cap. Browser connection
limits and backend throughput can still queue or slow actual transfers. The API
generates WebP on demand and keeps a bounded 16-entry cache, so cold encoding can
also contribute to latency. No backend performance improvement has been measured.

Manual test checklist:

- [ ] Open a large dossier on mobile; confirm all visible preview requests are initiated together and no critical image requests appear.
- [ ] Confirm progress normally totals three previews per photo, and opening waits for all of them to decode.
- [ ] Switch all photos and Pièces/Dommages after arrival; confirm prepared images appear without another download.
- [ ] Cancel during loading; verify pending image requests stop and no delayed navigation occurs.
- [ ] Break one preview, verify Retry/Cancel, then restore it and retry.
- [ ] Check desktop opening, empty results, direct reload and reduced motion.

Suggested commit: `perf(dossier): load all visible previews concurrently and skip critical images`
