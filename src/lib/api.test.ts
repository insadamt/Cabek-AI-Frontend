import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API media URL resolution', () => {
  it('uses the API origin for root-relative URLs returned behind a proxy', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_API_BASE_URL', 'https://cabek.example/service/');
    const { resolveMediaUrl } = await import('./api');
    expect(resolveMediaUrl('/service/api/dossiers/TEST/media/photos/avant%2001.jpg')).toBe(
      'https://cabek.example/service/api/dossiers/TEST/media/photos/avant%2001.jpg',
    );
    expect(resolveMediaUrl('/service/api/dossiers/TEST/preview/photos/avant%2001.jpg.webp')).toBe(
      'https://cabek.example/service/api/dossiers/TEST/preview/photos/avant%2001.jpg.webp',
    );
    expect(resolveMediaUrl('api/dossiers/TEST/report')).toBe(
      'https://cabek.example/service/api/dossiers/TEST/report',
    );
  });

  it('routes development images and reports through the frontend proxy', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:39279/service');
    const { resolveMediaUrl } = await import('./api');
    expect(resolveMediaUrl('/service/api/dossiers/TEST/media/photos/avant%2001.jpg')).toBe(
      '/api/dossiers/TEST/media/photos/avant%2001.jpg',
    );
    expect(resolveMediaUrl('/service/api/dossiers/TEST/report')).toBe('/api/dossiers/TEST/report');
    expect(resolveMediaUrl('/service/api/dossiers/TEST/preview/photos/avant%2001.jpg.webp')).toBe(
      '/api/dossiers/TEST/preview/photos/avant%2001.jpg.webp',
    );
    expect(resolveMediaUrl('https://images.example/photo.jpg')).toBe(
      'https://images.example/photo.jpg',
    );
  });

  it('keeps local illustration paths unchanged in preview mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { isPreview, resolveMediaUrl, startScan } = await import('./api');
    expect(isPreview).toBe(true);
    expect(resolveMediaUrl('/preview/vehicle.svg')).toBe('/preview/vehicle.svg');
    await expect(startScan('TEST')).rejects.toMatchObject({ code: 'preview_only' });
  });
});
