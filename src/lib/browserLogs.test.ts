/** Verify browser diagnostics survive reloads and remain bounded during API outages.
 * Depends on an in-memory Storage adapter; no browser automation or network is used. */
import { expect, it } from 'vitest';
import { createBrowserLogStore, redactLog } from './browserLogs';

it('persists redacted messages across store instances', () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const store = createBrowserLogStore(storage);
  store.record('api.http', 'Bearer credential token=secret password=hidden', {
    request_id: 'request',
  });
  const restored = createBrowserLogStore(storage).read();
  expect(restored).toHaveLength(1);
  expect(restored[0].message).not.toMatch(/credential|secret|hidden/);
  expect(restored[0].request_id).toBe('request');
});

it('keeps a bounded in-memory fallback when storage fails', () => {
  const store = createBrowserLogStore({
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
  });
  for (let index = 0; index < 1010; index++) store.record('browser', `failure ${index}`);
  expect(store.read()).toHaveLength(1000);
  expect(store.read()[0].message).toBe('failure 1009');
  expect(store.persistent()).toBe(false);
});

it('handles corrupted history and sanitizes credential-bearing URLs', () => {
  const store = createBrowserLogStore({ getItem: () => '{broken', setItem: () => {} });
  expect(store.read()).toEqual([]);
  expect(redactLog('https://user:password@local/path?api_key=secret')).not.toMatch(
    /user|password|secret/,
  );
});
