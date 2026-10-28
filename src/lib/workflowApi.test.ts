/** Confirms documented CABEK workflow request shapes, sequential uploads and partial-failure behavior. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('axios', () => ({
  default: { create: () => client, isCancel: () => false, isAxiosError: () => false },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_API_BASE_URL', 'https://cabek.example');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('CABEK workflow transport', () => {
  it('sends category, search, workflow, date and sorting filters to the server', async () => {
    client.get.mockResolvedValue({ data: { items: [], total: 0 } });
    const { listDossiers } = await import('./api');
    const query = {
      type: 'verification' as const,
      search: 'أ',
      status: 'all' as const,
      workflow_status: 'comparison_ready' as const,
      created_from: '2026-01-01',
      created_to: '2026-12-31',
      sort: 'updated_at_desc' as const,
      limit: 24,
      offset: 24,
    };
    const signal = new AbortController().signal;
    await listDossiers(query, signal);
    expect(client.get).toHaveBeenCalledExactlyOnceWith('/api/dossiers', {
      signal,
      params: { ...query, status: undefined },
    });
  });
  it('creates only after complete metadata, using IDs rather than catalogue names', async () => {
    const { createDossier } = await import('./api');
    const input = {
      type: 'verification' as const,
      marque_id: 12,
      model_id: 34,
      matricule: '123 · أ · 6',
      date_mise_en_circulation: '2020-05-17',
    };
    await expect(createDossier({ ...input, date_mise_en_circulation: '' })).rejects.toMatchObject({
      code: 'invalid_request',
    });
    expect(client.post).not.toHaveBeenCalled();
    client.post.mockResolvedValue({ data: { dossier_id: 'NEW' } });
    await createDossier(input);
    expect(client.post).toHaveBeenCalledExactlyOnceWith('/api/dossiers', input, {
      signal: undefined,
    });
  });
  it('queries models by marque_id through CABEK Global', async () => {
    client.get.mockResolvedValue({ data: [] });
    const { listModels } = await import('./api');
    await listModels(12);
    expect(client.get).toHaveBeenCalledExactlyOnceWith('/api/vehicles/models', {
      signal: undefined,
      params: { marque_id: 12 },
    });
  });
  it('uploads multiple quick-estimate photos in separate multipart requests without a phase', async () => {
    const { uploadDossierPhotos } = await import('./api');
    client.post
      .mockResolvedValueOnce({ data: { dossier_id: 'D 1', photos: [1] } })
      .mockResolvedValueOnce({ data: { dossier_id: 'D 1', photos: [1, 2] } });
    const onSaved = vi.fn();
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ];
    await uploadDossierPhotos({ dossierId: 'D 1', side: 'left', files }, undefined, onSaved);
    expect(client.post).toHaveBeenCalledTimes(2);
    for (const [index, call] of client.post.mock.calls.entries()) {
      expect(call[0]).toBe('/api/dossiers/D%201/photos');
      expect(call[1].get('side')).toBe('left');
      expect(call[1].get('phase')).toBeNull();
      expect(call[1].get('file').name).toBe(files[index].name);
    }
    expect(onSaved.mock.calls.map((call) => call[1])).toEqual([1, 2]);
  });
  it('sends explicit before/after metadata and stops after a partial failure', async () => {
    const { uploadDossierPhotos } = await import('./api');
    client.post
      .mockResolvedValueOnce({ data: { photos: [1] } })
      .mockRejectedValueOnce(new Error('Disconnected'));
    const files = Array.from(
      { length: 3 },
      (_, index) => new File(['photo'], `${index}.jpg`, { type: 'image/jpeg' }),
    );
    const saved = vi.fn();
    await expect(
      uploadDossierPhotos(
        { dossierId: 'V', side: 'front', phase: 'before', files },
        undefined,
        saved,
      ),
    ).rejects.toThrow('Disconnected');
    expect(client.post).toHaveBeenCalledTimes(2);
    expect(client.post.mock.calls[0][1].get('phase')).toBe('before');
    expect(saved).toHaveBeenCalledExactlyOnceWith({ photos: [1] }, 1);
  });
  it('rejects empty/unsupported/oversized uploads and unsupported live sort without requests', async () => {
    const { uploadDossierPhotos, listDossiers } = await import('./api');
    await expect(
      uploadDossierPhotos({ dossierId: 'V', side: 'front', files: [] }),
    ).rejects.toMatchObject({ code: 'invalid_image' });
    await expect(
      uploadDossierPhotos({
        dossierId: 'V',
        side: 'front',
        files: [new File(['x'], 'x.gif', { type: 'image/gif' })],
      }),
    ).rejects.toMatchObject({ code: 'invalid_image' });
    await expect(
      uploadDossierPhotos({
        dossierId: 'V',
        side: 'front',
        files: [{ type: 'image/jpeg', size: 11 * 1024 * 1024 } as File],
      }),
    ).rejects.toMatchObject({ code: 'upload_too_large' });
    await expect(
      listDossiers({ search: '', status: 'all', sort: 'brand_asc', limit: 12, offset: 0 }),
    ).rejects.toMatchObject({ code: 'unsupported_sort' });
    expect(client.post).not.toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
  });
  it('does not upload after cancellation', async () => {
    const { uploadDossierPhotos } = await import('./api');
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadDossierPhotos(
        {
          dossierId: 'V',
          side: 'front',
          files: [new File(['photo'], 'f.jpg', { type: 'image/jpeg' })],
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(client.post).not.toHaveBeenCalled();
  });
});
