/** Verify credentials stay in headers and effect payloads honor server schemas.
 * Depends on a mocked fetch transport; no browser automation or hardware access. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lightingRequest, loadLightingSession, previewPayload } from './lightingApi';

afterEach(() => vi.unstubAllGlobals());

describe('protected lighting requests', () => {
  it('uses a bearer header without storing a token in the URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: 'READY' }) });
    vi.stubGlobal('fetch', fetcher);
    await lightingRequest('private-key', '/stop', {});
    const [url, options] = fetcher.mock.calls[0];
    expect(url).not.toContain('private-key');
    expect(options.headers.Authorization).toBe('Bearer private-key');
    expect(options.method).toBe('POST');
    expect(options.redirect).toBe('error');
  });
  it('propagates a server authorization or scan conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          json: async () => ({ error: { message: 'Capture owns lights' } }),
        }),
    );
    await expect(lightingRequest('key', '/effects', {})).rejects.toThrow('Capture owns lights');
  });
  it('only reads state when opening the panel', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);
    await loadLightingSession('key');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
  });
  it('omits irrelevant effect parameters and supports brightness zero', () => {
    expect(
      previewPayload(
        { effect: 'solid', supported: true, parameters: { color: {}, brightness: {} } },
        '#000000',
        0,
        2000,
      ),
    ).toEqual({ effect: 'solid', color: '#000000', brightness: 0 });
    expect(
      previewPayload(
        {
          effect: 'breathing',
          supported: true,
          parameters: { brightness: {}, min_brightness: {}, repeat: {} },
        },
        '#000000',
        0,
        2000,
      ),
    ).toEqual({ effect: 'breathing', brightness: 0, min_brightness: 0, repeat: true });
  });
});
