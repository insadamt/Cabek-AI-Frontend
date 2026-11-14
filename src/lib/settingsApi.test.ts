/** Verify settings requests address CABEK AI only and preserve backend errors.
 * Depends on mocked fetch; no serial service or browser is contacted. */
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ apiBaseUrl: 'http://127.0.0.1:8000', isPreview: false }));
import { testLights } from './settingsApi';
afterEach(() => vi.unstubAllGlobals());

describe('backend settings transport', () => {
  it('posts effect parameters to CABEK AI and sends a bodyless OFF', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, status: 'off' }) });
    vi.stubGlobal('fetch', fetcher);
    const payload = { effect: 'breathing' as const, speed: 1.5, repeat: true };
    await testLights('/set', payload);
    await testLights('/off');
    expect(fetcher.mock.calls[0][0]).toMatch(/\/api\/settings\/lights\/set$/);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload);
    expect(fetcher.mock.calls[1][0]).toMatch(/\/api\/settings\/lights\/off$/);
    expect(fetcher.mock.calls[1][1]).not.toHaveProperty('body');
    expect(fetcher.mock.calls.every(([url]) => !url.includes('8001'))).toBe(true);
    expect(fetcher.mock.calls[1][1].redirect).toBe('error');
  });
  it('shows the backend firmware error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          json: async () => ({ error: { message: 'RGB firmware required' } }),
        }),
    );
    await expect(testLights('/set', { effect: 'pulse' })).rejects.toThrow('RGB firmware required');
  });
});
