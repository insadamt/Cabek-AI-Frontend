# Dossier opening and photo inspection

The details page keeps the folder and metadata at the left and adds photo inspection at the right. This stage contains the photo workspace only; financial tabs, damage rows and PDF actions remain for later steps.

Activating **Ouvrir** from the home carousel or a focused search folder returns the document directly into its pocket using the existing reversible timeline. Navigation waits for the actual closed event, including reduced-motion completion. The source section stays inert during insertion, repeated opening is ignored, and navigation elsewhere cancels the pending opening.

The details page animates the folder from its measured source rectangle to the upper left, then reveals metadata and photo inspection. The carried summary is immediately available while normal API reads load the saved result. Image requests do not block opening. The inspection viewer loads and decodes the requested original/annotation pair with its existing loading, crossfade and retry behavior.

There is no bulk image preload, decoded-image cache, loading round trip through the island or photo-card flight. The dynamic island retains its existing analysis behavior. Opening a saved dossier only reads data and never submits a scan.

Metadata includes reference, make, model, registration, year, loss date, creation date and photo count, with explicit missing-value fallbacks and bidirectional registration text. The details-page folder remains decorative.

The home frame, activity island and neutral styling are reused. On desktop, the dossier frame occupies one dynamic viewport with no page scroll. On phones (up to 767px wide, and landscape up to 950px wide with height at most 520px), the main content scrolls vertically within the frame. The main grid and comparison image shrink to the available height while their controls retain their own rows. Direct links/reloads use a brief local entrance without needing a source folder. Back/Forward revisits do not reuse stale travel coordinates: the entrance snapshot is removed from history after reading. Reduced motion skips travel and stagger; resizing during the entrance settles the sequence to avoid stale coordinates.

The folder artwork keeps the focused view's native `--home-folder-width` and aspect ratio. A uniform transform scales it into the smaller sidebar slot; the registration plate, label, paper and shadows retain their shared styling and proportions. Resize observation updates the fitting scale without reflowing the artwork contents. Travel also uses a uniform scale to avoid stretching the folder.

## Photo inspection

After the folder and metadata timeline completes, the right workspace fades in with a 12px upward movement. Hidden controls are inert until the entrance completes. The workspace shell remains mounted while result data loads, so a slow request does not replay the folder animation. Reduced motion removes the reveal transition.

Inspection includes a large original/annotated comparison, Pièces/Dommages controls, a photo counter, previous/next controls, lazy-loaded original thumbnails. Comparisons stay inline; the detail page has no fullscreen/enlarge action or image modal. Both comparison images load and decode before the existing crossfade replaces the pair. Image errors retain the existing retry behavior; result errors show a retry notice and retain previously received photos. Empty results and pending analysis have distinct messages.

Changing annotation mode preserves the split. Changing photos resets it to the middle, while selecting the current thumbnail leaves it intact. Arrow keys navigate within the workspace except on the comparison slider, which keeps its native keyboard behavior. A bounded window of thumbnails follows the selected photo. The number of visible thumbnails is measured from the available width, so neither the page nor the thumbnail strip needs scrolling. Previous/next buttons and arrow keys reach photographs outside the visible window.

The folder/metadata and inspection remain side by side on desktop. Phones use a single column with a compact folder beside the vehicle identity, two-column metadata and a full-width comparison below. Long vehicle names and metadata wrap so their complete values are available without tooltips. The comparison has a 4:3 aspect ratio and a 240px minimum height; loading and empty states also retain useful space. The main content scrolls vertically, including in short phone landscape and at enlarged text sizes, while the header stays in its own row. Horizontal slider gestures adjust the split, and vertical gestures may scroll the page. Back, annotation and navigation controls retain at least 44px touch targets. Safe-area padding protects content near device edges. The folder keeps its focused artwork dimensions and scales uniformly into an 88px slot. Desktop short-landscape controls still share rows to reserve height for the image.

## Verification

Run `npm test`, `npm run build` and `git diff --check`. Opening tests cover document insertion, actual source coordinates, already-closed documents, cancellation and repeated activation. Photo rendering checks cover loading, empty/pending/error states, retained photos after refresh failure, single-photo boundaries and the absence of an enlarge action. Separate legacy viewer checks still cover selection restoration/clamping. Browser automation is not used; visual and device behavior still require the manual checks below.

## Manual test checklist

- [ ] Activate Ouvrir: confirm the document returns directly into the folder, then the folder moves upper left and details appear.
- [ ] Throttle the network and verify image loading does not delay navigation or start a loading sequence in the island.
- [ ] Verify the viewer shows loading feedback and retry for unavailable images, while metadata remains usable.
- [ ] Repeat from the carousel and focused search results, including a folder whose document is already closed.
- [ ] Confirm the folder arrives in the upper left, followed by metadata appearing beneath it in sequence.
- [ ] Compare the focused and sidebar folders: plate, label, paper and shadows should keep the same proportions, with only overall scale changing.
- [ ] Confirm the right photo workspace appears after folder/metadata entrance, without replaying that entrance when results finish loading.
- [ ] Change photos with thumbnails, buttons and keyboard arrows; confirm the selected thumbnail remains visible and the page does not jump.
- [ ] Drag and keyboard-adjust the comparison slider, switch Pièces/Dommages and confirm split retention. Selecting another photo resets it; selecting the same photo does not.
- [ ] Confirm there is no fullscreen/enlarge button or image modal on the detail page; comparison, modes and photo navigation work inline.
- [ ] Test one photo, no photos, pending/failed analysis, slow network, broken images, rapid mode changes and result refresh failure/retry.
- [ ] Verify desktop retains its viewport layout; phones stack metadata above the full-width photo and scroll vertically without horizontal overflow. Check touch targets and reduced motion.
- [ ] Confirm no estimate, PDF or damage panels have been added in this stage.
- [ ] Check every metadata value against the selected dossier; verify long text, missing values, zero photos and Arabic/Latin registration.
- [ ] Click Ouvrir repeatedly during insertion; confirm one opening. Navigate elsewhere during insertion and confirm no delayed redirect.
- [ ] Open during carousel settling and verify the visible folder is used; Back should restore its selection.
- [ ] Use direct links, reload and Back/Forward; confirm a usable page without a stale travel path.
- [ ] Check desktop, tablet, 320px/390px phones and short landscape; verify header spacing, wrapped long metadata, a useful comparison area and no horizontal overflow. On phones verify vertical scrolling works, including starting a vertical gesture over the comparison.
- [ ] Resize/rotate during folder travel and metadata reveal; confirm the final folder and metadata positions are correct.
- [ ] Check keyboard activation, focus visibility, 200% zoom and reduced motion (including changing the preference during animation).
- [ ] Verify home analysis launch/progress still works and opening a saved dossier sends no scan POST.

Suggested commit: `refactor(dossier): simplify opening and load images in the viewer`


## Mobile detail update

Responsive overrides live in `src/styles/dossier-mobile.css`, after the desktop workspace styles. The detail workspace owns its inline photo selection and no longer opens `ImageViewer`. No browser automation was used for this update.

Suggested commit: `feat(dossier): improve mobile layout and remove photo fullscreen action`
