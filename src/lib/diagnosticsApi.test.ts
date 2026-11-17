/** Verify safe diagnostics and explicit mutation requests use their intended boundaries.
 * Depends on mocked fetch; no hardware commands, model runs or browser automation. */
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ apiBaseUrl: 'http://127.0.0.1:8000', isPreview: false }));
import {
  readOperation,
  saveOperation,
  runDiagnostics,
  readLogs,
  testInterior,
} from './diagnosticsApi';

afterEach(() => vi.unstubAllGlobals());
it('keeps safe checks separate from lighting commands and records mode only on save', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ slow_mode: true, checks: [] }) });
  vi.stubGlobal('fetch', fetcher);
  await readOperation();
  await runDiagnostics();
  await saveOperation(true);
  expect(fetcher.mock.calls[0][1].method).toBe('GET');
  expect(fetcher.mock.calls[1][0]).toMatch(/\/diagnostics\/run$/);
  expect(fetcher.mock.calls[1][1].body).toBe('{}');
  expect(fetcher.mock.calls[2][1].method).toBe('PATCH');
  expect(
    fetcher.mock.calls.every(([url]) => !url.includes('/lights/') && !url.includes('/capture')),
  ).toBe(true);
});

it('passes bounded log filters and uses bodyless explicit interior commands', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) });
  vi.stubGlobal('fetch', fetcher);
  await readLogs({ source: 'backend', query: 'worker failed', dossier_id: 'TEST' }, 'cursor');
  expect(fetcher.mock.calls[0][0]).toContain('limit=200');
  expect(fetcher.mock.calls[0][0]).toContain('cursor=cursor');
  await testInterior('off');
  expect(fetcher.mock.calls[1][0]).toMatch(/\/internal-lights\/off$/);
  expect(fetcher.mock.calls[1][1]).not.toHaveProperty('body');
});
