/** Verify startup waits for decoded shared assets and fonts, then reuses its session preparation.
 * Depends on browser adapters; no network, GPU or browser automation is used. */
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('waits for fonts and every image decode, retaining one preparation for later routes', async () => {
  let releaseFont!: () => void;
  const font = new Promise<void>((resolve) => {
    releaseFont = resolve;
  });
  const load = vi.fn(() => font);
  const decode = vi.fn(async () => {});
  vi.stubGlobal('document', { fonts: { load } });
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      decode = decode;
    },
  );
  const { prepareApplicationImages } = await import('./applicationAssets');
  const task = prepareApplicationImages();
  let ready = false;
  void task.then(() => {
    ready = true;
  });
  await Promise.resolve();
  expect(ready).toBe(false);
  expect(load).toHaveBeenCalledOnce();
  expect(decode.mock.calls.length).toBeGreaterThan(30);
  expect(prepareApplicationImages()).toBe(task);
  releaseFont();
  await task;
  expect(ready).toBe(true);
  expect(prepareApplicationImages()).toBe(task);
});

it('keeps dossier access available when optional artwork fails to decode', async () => {
  vi.stubGlobal('document', {});
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      decode = async () => {
        throw new Error('Missing artwork');
      };
    },
  );
  const { prepareApplicationImages } = await import('./applicationAssets');
  await expect(prepareApplicationImages()).resolves.toBeUndefined();
});
