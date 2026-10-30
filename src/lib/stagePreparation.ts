/**
 * Prepares the stage's font metrics and cached island logo before revealing its interface.
 * Depends on browser FontFaceSet and image decoding; missing branding must never block dossier access.
 */
export async function prepareStageIdentity() {
  const logo = new Image();
  logo.src = '/images/cabek-ai-logo-white.png';

  //
  // Decoding avoids an empty logo on reveal; failed optional branding still releases the loading screen.
  //
  await Promise.allSettled([
    document.fonts?.ready ?? Promise.resolve(),
    typeof logo.decode === 'function' ? logo.decode() : Promise.resolve(),
  ]);
}
