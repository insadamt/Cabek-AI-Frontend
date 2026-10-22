# Legacy dashboard removal

The folder home at `/` is the dossier entry point. The old dashboard at
`/dossiers`, its sidebar layout, the header Dossiers link and the grid shortcut
have been removed, along with their dedicated presentation styles and motion
hook. The Accueil header button and its unused navigation styles have also
been removed. Shared branding styles remain available to the activity island.

Individual `/dossiers/:id` links still open the dossier workspace. Removed and
unknown routes use the home frame's missing-page view and offer a return to `/`.
The home search and carousel remain the ways to find and open dossiers.

## Manual test checklist

- [ ] Open `/` on desktop and mobile: the header shows the activity island, with no Accueil button, Dossiers link or grid shortcut.
- [ ] Browse folders, search for a vehicle and open a dossier from both views.
- [ ] Open a dossier directly, reload, then use the dossier return control and browser Back/Forward.
- [ ] Open `/dossiers`, `/dossiers?status=processing` and an unknown route: verify the missing-page view and return-to-home action.
- [ ] Check keyboard focus, the skip link, narrow-screen header spacing and analysis-island activity.

The existing browser suite contains legacy dashboard scenarios and requires
updating before use. Browser automation was not run for this removal.

Suggested commit: `refactor: remove legacy dashboard and its navigation`
