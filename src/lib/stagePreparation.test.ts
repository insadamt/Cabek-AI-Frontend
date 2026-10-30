/**
 * Guards the real font/logo preparation gate so cached assets or optional failures cannot reveal a partial interface.
 * Depends on stagePreparation and deferred browser adapters; no browser automation or elapsed-time waits are used.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareStageIdentity } from './stagePreparation';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function createBrowserPreparation() {
  const fonts = deferred();
  const image = deferred();
  const logo = { src: '', decode: vi.fn(() => image.promise) };
  vi.stubGlobal('document', { fonts: { ready: fonts.promise } });
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        return logo;
      }
    },
  );
  return { fonts, image, logo };
}

afterEach(() => vi.unstubAllGlobals());

describe('stage identity preparation', () => {
  it.each(['fonts first', 'image first'])(
    'waits for both assets when %s resolves',
    async (order) => {
      const browser = createBrowserPreparation();
      const ready = vi.fn();
      const preparation = prepareStageIdentity().then(ready);
      expect(browser.logo.src).toBe('/images/cabek-ai-logo-white.png');
      expect(browser.logo.decode).toHaveBeenCalledOnce();
      const [first, last] =
        order === 'fonts first' ? [browser.fonts, browser.image] : [browser.image, browser.fonts];
      first.resolve();
      await Promise.resolve();
      expect(ready).not.toHaveBeenCalled();
      last.resolve();
      await preparation;
      expect(ready).toHaveBeenCalledOnce();
    },
  );

  it('releases optional branding failures instead of leaving the application loading', async () => {
    const browser = createBrowserPreparation();
    const preparation = prepareStageIdentity();
    browser.fonts.reject(new Error('Font unavailable'));
    browser.image.reject(new Error('Logo unavailable'));
    await expect(preparation).resolves.toBeUndefined();
  });

  it('supports environments without FontFaceSet or image decoding', async () => {
    vi.stubGlobal('document', {});
    vi.stubGlobal(
      'Image',
      class {
        src = '';
      },
    );
    await expect(prepareStageIdentity()).resolves.toBeUndefined();
  });
});
