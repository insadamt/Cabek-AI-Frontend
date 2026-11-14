/** Verify direct commands, bodyless OFF and palettes using mocked fetch.
 * Depends on Vitest; no browser automation or physical hardware is used. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectPayload, lightingEffects, lightingRequest } from './lightingApi';

afterEach(() => vi.unstubAllGlobals());

describe('lighting commands', () => {
  it('sends a bodyless POST for OFF without authorization or redirects', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, status: 'off' }) });
    vi.stubGlobal('fetch', fetcher);
    await lightingRequest('/off');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/api\/lights\/off$/);
    expect(options.method).toBe('POST');
    expect(options).not.toHaveProperty('body');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options.redirect).toBe('error');
  });
  it('posts set parameters and propagates firmware errors', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false,
      json: async () => ({ error: { message: 'RGB firmware required' } }) });
    vi.stubGlobal('fetch', fetcher);
    await expect(lightingRequest('/set', { effect: 'solid', brightness: 100 })).rejects.toThrow('RGB firmware required');
    expect(fetcher.mock.calls[0][0]).toMatch(/\/api\/lights\/set$/);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ effect: 'solid', brightness: 100 });
  });
  it('builds solid and multicolor requests with consistent cycle duration and speed', () => {
    expect(effectPayload('solid', '#000000', 0, 2000, 2, true, 'linear', '')).toEqual({
      effect: 'solid', color: '#000000', brightness: 0,
    });
    expect(effectPayload('color_cycle', '#FFFFFF', 70, 2000, .8, true, 'ease_in_out', '#0066FF, #8B00FF; #00FFFF')).toEqual({
      effect: 'color_cycle', color: '#FFFFFF', brightness: 70, duration_ms: 2000,
      speed: .8, repeat: true, easing: 'ease_in_out', colors: ['#0066FF', '#8B00FF', '#00FFFF'],
    });
    expect(lightingEffects).toHaveLength(13);
  });
});
