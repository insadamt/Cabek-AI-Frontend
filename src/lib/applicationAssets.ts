/** Retain decoded shared artwork for the browser session so route changes reuse prepared images.
 * Depends on public image assets and FontFaceSet; dynamic dossier photographs stay owned by their existing caches. */
const sharedImageUrls = [
  '/brand/cabek-logo.png',
  '/preview/vehicle.svg',
  '/preview/parts.svg',
  '/preview/damages.svg',
  '/images/cabek-ai-logo-black.png',
  '/images/cabek-ai-logo-white.png',
  '/images/categories/before-after.webp',
  '/images/categories/expertise.webp',
  '/images/categories/quick-estimate.webp',
  '/images/parts/front-bumper.webp',
  '/images/parts/front-door-left.webp',
  '/images/parts/front-door-right.webp',
  '/images/parts/front-fender-left.webp',
  '/images/parts/front-fender-right.webp',
  '/images/parts/grille.webp',
  '/images/parts/headlight-left.webp',
  '/images/parts/headlight-right.webp',
  '/images/parts/hood.webp',
  '/images/parts/rear-bumper.webp',
  '/images/parts/rear-door-left.webp',
  '/images/parts/rear-door-right.webp',
  '/images/parts/rear-fender-left.webp',
  '/images/parts/rear-fender-right.webp',
  '/images/parts/rear-light-left.webp',
  '/images/parts/rear-light-right.webp',
  '/images/parts/rear-windshield.webp',
  '/images/parts/rocker-panel.webp',
  '/images/parts/side-mirror-left.webp',
  '/images/parts/side-mirror-right.webp',
  '/images/parts/tire.webp',
  '/images/parts/trunk.webp',
  '/images/parts/unknown.webp',
  '/images/parts/wheel.webp',
  '/images/parts/window.webp',
  '/images/parts/windshield.webp',
];
const retainedImages = new Map<string, HTMLImageElement>();
let preparation: Promise<void> | undefined;
const failedImages = new Set<string>();
let preparing = true;
export function applicationAssetStatus() {
  return { loaded: retainedImages.size, failed: [...failedImages], pending: preparing };
}

export function prepareApplicationImages() {
  return (preparation ??= (async () => {
    await Promise.allSettled([
      document.fonts?.load('500 16px "Manrope Variable"') ?? Promise.resolve(),
      ...sharedImageUrls.map(async (url) => {
        const image = new Image();
        image.src = url;
        try {
          await image.decode();
          retainedImages.set(url, image);
        } catch (error) {
          failedImages.add(url);
          throw error;
        }
      }),
    ]);
    preparing = false;
  })());
}
