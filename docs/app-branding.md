# Cabek AI app branding

The shared `Brand` component uses the supplied Cabek AI PNG assets from
`public/images`: black on the sidebar's light background and white on the dark
home/dossier activity island. The existing wordmark accompanies the logo; the
sidebar footer uses the compact logo. The browser tab uses the black asset.

The wordmark reads “Cabek AI” without a trailing dot. It uses Manrope with natural
kerning, lighter weights and restrained tracking. Both words share the same size
and color, including inside the activity island.

Branding fills its available row: the logo sits at the far left and “Cabek AI”
at the far right. The island keeps 18px of padding to clear its curved edges.

This updates the earlier app-branding guidance in `home-redesign.md`. Vehicle
documents continue using the separate blue Cabek company logo.

The island logo and wordmark slide straight up together by 44px as work starts,
passing beyond the island's clip. Returning to idle reverses the same 240ms
motion, sliding them back down. There is no rotation, scaling, horizontal motion
or fade. Navigation, Back and page reloads show the logo already settled in its
current state. The downward animation only plays after an actual working-to-idle
change. Interrupted
transitions reverse from their current position, and reduced motion settles
immediately. This motion never delays API requests or image loading.

The category stage adds a separate, opt-in entrance on its header wrapper after
real studio preparation. The Island pops into the top frame while cards and the
model enter nearby; its internal work/idle logo animation stays independent.
Other routes keep the settled header behavior. See [stage-entrance.md](stage-entrance.md).

The same island and branding stay mounted during analysis and dossier image
preparation. The opening activity replaces only the progress content so switching
back to idle can animate the logo rather than replacing the entire island.

Manual test checklist:

- [ ] On the home and dossier pages, check the white logo sits at the left and the wordmark at the right inside the idle island.
- [ ] On the dossiers list, check the black logo in the sidebar and its footer, including the mobile navigation drawer.
- [ ] Check desktop and 320px/390px phone widths for clipping or overlap.
- [ ] Confirm the wordmark reads “Cabek AI”, with matching text sizes and no dot.
- [ ] Activate each main logo with mouse and keyboard; verify it returns home.
- [ ] Start an analysis; verify the idle branding yields to progress and returns afterward.
- [ ] Navigate away and return with Back; verify the already-idle logo does not replay its downward animation.
- [ ] Open a dossier and cancel while images load; verify the logo animates out and back without flickering or interrupting loading cancellation.
- [ ] Start/stop work rapidly; verify the logo reverses smoothly and returns to its original proportions.
- [ ] Enable reduced motion before and during work; verify an immediate, usable idle/working state.
- [ ] Refresh the page and verify the browser tab shows the Cabek AI logo.
- [ ] Verify vehicle documents still display the separate blue Cabek company logo.

Suggested commit: `feat(branding): use Cabek AI logo across app navigation and favicon`
