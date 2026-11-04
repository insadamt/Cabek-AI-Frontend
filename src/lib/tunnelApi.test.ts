/** Checks the final backend tunnel contract without inventing endpoint names, photos or AI responses. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('axios', () => ({
  default: { create: () => client, isCancel: () => false, isAxiosError: () => false },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('final tunnel transport contract', () => {
  it('creates a persistent type-only draft with the supplied idempotency key', async () => {
    client.post.mockResolvedValue({ data: { dossier_id: 'SERVER-ID' } });
    const { createDraft } = await import('./api');
    const signal = new AbortController().signal;
    expect(await createDraft('chiffrage_rapide', 'stable-key', signal)).toEqual({
      dossier_id: 'SERVER-ID',
    });
    expect(client.post).toHaveBeenCalledExactlyOnceWith(
      '/api/dossiers',
      { type: 'chiffrage_rapide' },
      { signal, headers: { 'Idempotency-Key': 'stable-key' } },
    );
  });
  it('starts quick capture bodylessly and reads a separate capture resource', async () => {
    client.post.mockResolvedValue({ data: { status: 'capturing' } });
    client.get.mockResolvedValue({ data: { saved_count: 2 } });
    const { startCapture, readCapture } = await import('./api');
    const signal = new AbortController().signal;
    await startCapture('REAL 1', undefined, signal);
    await readCapture('REAL 1', undefined, signal);
    expect(client.post).toHaveBeenCalledWith('/api/dossiers/REAL%201/capture', undefined, {
      signal,
    });
    expect(client.get).toHaveBeenCalledWith('/api/dossiers/REAL%201/capture', {
      signal,
      params: undefined,
    });
  });
  it.each(['before', 'after'] as const)(
    'keeps verification phase %s linked in admission and polling',
    async (phase) => {
      client.post.mockResolvedValue({ data: {} });
      client.get.mockResolvedValue({ data: {} });
      const { startCapture, readCapture } = await import('./api');
      await startCapture('SAME-ID', phase);
      await readCapture('SAME-ID', phase);
      expect(client.post).toHaveBeenCalledWith(
        '/api/dossiers/SAME-ID/capture',
        { phase },
        { signal: undefined },
      );
      expect(client.get).toHaveBeenCalledWith('/api/dossiers/SAME-ID/capture', {
        params: { phase },
        signal: undefined,
      });
    },
  );
  it('PATCHes metadata with Arabic unchanged and accepts the full canonical dossier', async () => {
    const input = {
      matricule: '84654-ب-454',
      marque_id: 12,
      model_id: 34,
      date_mise_en_circulation: '2020-05-17',
    };
    const response = { dossier_id: 'D1', vehicle: input };
    client.patch.mockResolvedValue({ data: response });
    const { patchMetadata } = await import('./api');
    expect(await patchMetadata('D1', input)).toEqual(response);
    expect(client.patch).toHaveBeenCalledWith('/api/dossiers/D1/metadata', input, {
      signal: undefined,
    });
  });
  it('refuses to synthesize drafts, captures or metadata when no backend is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const api = await import('./api');
    await expect(api.createDraft('verification', 'key')).rejects.toMatchObject({
      code: 'preview_only',
    });
    await expect(api.startCapture('D1', 'before')).rejects.toMatchObject({ code: 'preview_only' });
    await expect(api.readCapture('D1', 'before')).rejects.toMatchObject({ code: 'preview_only' });
    await expect(api.patchMetadata('D1', { matricule: '14554-B-4578' })).rejects.toMatchObject({
      code: 'preview_only',
    });
    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
  });
});

it('deletes the selected persisted folder with the documented endpoint and no body', async () => {
  client.delete.mockResolvedValue({ data: undefined });
  const { deleteDossier } = await import('./api');
  const signal = new AbortController().signal;
  await expect(deleteDossier('REAL 42', signal)).resolves.toBeUndefined();
  expect(client.delete).toHaveBeenCalledExactlyOnceWith('/api/dossiers/REAL%2042', { signal });
});
