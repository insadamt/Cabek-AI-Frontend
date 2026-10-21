# Folder home

The home fills the viewport with glass dossier folders. Only the centered, settled folder accepts hover, clicks, taps, and keyboard focus. Side folders are inert previews; swipes and arrows bring them into the center. Hovering the selected folder opens its pocket and reveals the top of a paper vehicle sheet. Clicking, tapping, or activating the folder with Enter/Space lifts that sheet above the front face. It shows marque, modèle, immatriculation, year, photo count, status, and the dossier reference from the existing list response. Missing vehicle fields use explicit “Non renseigné(e)” labels. The paper stays out while interacting with it or its folder. Clicking outside, pressing Escape, or switching folders returns it to the pocket.

The pocket opening changes shape on hover while its bottom contour stays fixed against the rear face. Extraction first lifts the paper clear of the pocket, moves it in front of the cover, and then lowers it into a readable position overlapping the folder. Closing reverses that same persistent timeline: the paper rises from its front position, changes layers at the pocket mouth, then slides inside. Interrupting a return plays forward from its current progress. The pocket stays open until the reverse finishes. The timeline remeasures on paper, folder, and viewport resizing. The folder keeps the same position and size throughout opening and return. Reduced motion jumps directly to the requested end state. Closed sheets are hidden from assistive technology, and the folder button exposes its expanded state. The home never fetches image previews or full dossier results; photographs remain in the dossier comparison viewer.

Dragging moves the folder track directly with the pointer. Long drags can cross several folders, and release velocity adds a bounded amount of momentum before the track settles. A new drag can interrupt settling. The collection loops in both directions. Neighboring API pages are prefetched, and the current window stays mounted while crossing a page boundary. If a neighbor request fails, the current page remains usable and selecting the missing page uses the normal loading/retry path.

Arrow buttons and keyboard arrows use the same animated track and easing as drag release. Repeated arrow clicks retarget the animation while preserving every requested step. Reduced motion skips gesture settling animations.

On phones, folders are larger and flatter, with 14px vehicle values, 44–48px touch controls, a visible “Ranger la fiche véhicule” close button, and safe-area spacing. Previous/next arrows sit below the content. Folder spacing and drag distance share a responsive spacing ratio. Long documents scroll vertically without triggering carousel settling; horizontal swipes still browse folders. Landscape uses a compact three-column document and its own placement.

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
- [ ] On a phone, check readable details, the paper close button, and the bottom navigation hit areas.
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
