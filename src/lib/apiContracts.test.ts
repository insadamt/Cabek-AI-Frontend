import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('axios', () => ({
  default: {
    create: () => client,
    isCancel: () => false,
    isAxiosError: (error: { isAxiosError?: boolean }) => error.isAxiosError === true,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('current backend API contracts', () => {
  it('reads current metadata and originals without a list or removed photos request', async () => {
    const response = {
      dossier_id: 'DOS 001',
      status: 'not_analyzed',
      vehicle: { marque_id: 12, model_id: 34, marque: '', modele: '', matricule: '' },
      photos: [{ photo_id: 'front', original_url: '/front.jpg', preview_url: '/front.webp' }],
      progress: null,
      error: null,
      result: null,
    };
    client.get.mockResolvedValue({ data: response });
    const { readDossier } = await import('./api');
    const signal = new AbortController().signal;
    expect(await readDossier('DOS 001', signal)).toEqual(response);
    expect(client.get).toHaveBeenCalledExactlyOnceWith('/api/dossiers/DOS%20001/result', {
      signal,
    });
    expect(client.post).not.toHaveBeenCalled();
  });

  it('submits only the vehicle IDs and returns canonical names as a partial vehicle', async () => {
    const resolved = { marque_id: 12, model_id: 34, marque: 'Dacia', modele: 'Sandero' };
    client.put.mockResolvedValue({ data: resolved });
    const { saveVehicle } = await import('./api');
    expect(await saveVehicle('DOS 001', { marque_id: 12, model_id: 34 })).toEqual(resolved);
    expect(client.put).toHaveBeenCalledExactlyOnceWith('/api/dossiers/DOS%20001/vehicle', {
      marque_id: 12,
      model_id: 34,
    });
  });

  it('starts scans without a body or mandatory metadata/catalogue reads', async () => {
    client.post.mockResolvedValue({ data: { status: 'queued' } });
    const { startScan } = await import('./api');
    const signal = new AbortController().signal;
    await expect(startScan('DOS 001', signal)).resolves.toEqual({ status: 'queued' });
    expect(client.post).toHaveBeenCalledExactlyOnceWith('/api/dossiers/DOS%20001/scan', undefined, {
      signal,
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'already_analyzed', 'déjà été analysé'],
    [409, 'scan_in_progress', 'déjà en cours'],
    [422, 'invalid_request', 'paramètres'],
    [503, 'autoestimate_unavailable', 'catalogue'],
  ])(
    'preserves HTTP %s and error.code %s with translated feedback',
    async (status, code, message) => {
      client.post.mockRejectedValue({
        isAxiosError: true,
        response: { status, data: { error: { code, message: 'Backend message' } } },
      });
      const { startScan } = await import('./api');
      await expect(startScan('DOS-001')).rejects.toMatchObject({
        status,
        code,
        message: expect.stringContaining(message),
      });
    },
  );
});
