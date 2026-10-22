import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('axios', () => ({
  default: {
    create: () => client,
    isCancel: () => false,
    isAxiosError: (error: { isAxiosError?: boolean }) => error?.isAxiosError === true,
  },
}));

const vehicle = {
  marque: 'Dacia',
  modele: 'Logan',
  marque_id: 12,
  model_id: 145,
  matricule: '00001-A-6',
  date_mise_en_circulation: '2019-06-14',
  date_sinistre: '2026-10-20',
};

function mockSavedMetadata(value = vehicle, status = 'not_analyzed') {
  client.get.mockImplementation(async (url: string) => ({
    data:
      url === '/api/dossiers'
        ? {
            items: [{ dossier_id: 'DOS-001', vehicle: value, status }],
            total: 1,
            limit: 100,
            offset: 0,
          }
        : url.endsWith('/marques')
          ? [{ id: 12, libelle: 'Dacia' }]
          : [{ id: 145, libelle: 'Logan', marque_id: 12 }],
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_API_BASE_URL', 'https://cabek.example');
  mockSavedMetadata();
});
afterEach(() => vi.unstubAllEnvs());

describe('scan metadata gate', () => {
  it('blocks incomplete saved metadata before any POST or catalogue lookup', async () => {
    mockSavedMetadata({ ...vehicle, date_sinistre: '', date_mise_en_circulation: '' });
    const { startScan } = await import('./api');
    await expect(startScan('DOS-001')).rejects.toMatchObject({
      code: 'invalid_metadata',
      status: 422,
      warnings: [
        expect.objectContaining({ field: 'date_mise_en_circulation' }),
        expect.objectContaining({ field: 'date_sinistre' }),
      ],
    });
    expect(client.post).not.toHaveBeenCalled();
    expect(client.get).toHaveBeenCalledTimes(1);
  });
  it('blocks catalogue mismatches before POST', async () => {
    mockSavedMetadata({ ...vehicle, model_id: 999 });
    const { startScan } = await import('./api');
    await expect(startScan('DOS-001')).rejects.toMatchObject({
      code: 'invalid_metadata',
      warnings: [expect.objectContaining({ field: 'model_id' })],
    });
    expect(client.post).not.toHaveBeenCalled();
  });
  it('posts once after checking persisted metadata and catalogue consistency', async () => {
    client.post.mockResolvedValue({ data: { status: 'queued' } });
    const { startScan } = await import('./api');
    await expect(startScan('DOS-001')).resolves.toEqual({ status: 'queued' });
    expect(client.post).toHaveBeenCalledExactlyOnceWith('/api/dossiers/DOS-001/scan', undefined, {
      signal: undefined,
    });
    expect(client.get).toHaveBeenCalledWith('/api/vehicles/models', {
      signal: undefined,
      params: { marque_id: 12 },
    });
  });
  it.each(['completed', 'processing', 'queued'])(
    'never posts when the fresh status is %s',
    async (status) => {
      mockSavedMetadata(vehicle, status);
      const { startScan } = await import('./api');
      await expect(startScan('DOS-001')).rejects.toMatchObject({ status: 409 });
      expect(client.post).not.toHaveBeenCalled();
    },
  );
  it('retains server field warnings from a rejected scan', async () => {
    const warning = {
      field: 'date_sinistre',
      code: 'required',
      message: 'La date du sinistre est obligatoire.',
    };
    client.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { code: 'invalid_metadata', warnings: [warning] } },
    });
    const { startScan } = await import('./api');
    await expect(startScan('DOS-001')).rejects.toMatchObject({
      code: 'invalid_metadata',
      warnings: [warning],
      message: expect.stringContaining(warning.message),
    });
  });
  it('saves full metadata including both dates and registration', async () => {
    client.put.mockResolvedValue({ data: vehicle });
    const { saveVehicle } = await import('./api');
    await expect(saveVehicle('DOS-001', vehicle)).resolves.toEqual(vehicle);
    expect(client.put).toHaveBeenCalledExactlyOnceWith('/api/dossiers/DOS-001/vehicle', vehicle);
  });

  it('never saves an incomplete metadata payload', async () => {
    const { saveVehicle } = await import('./api');
    await expect(saveVehicle('DOS-001', { ...vehicle, matricule: ' ' })).rejects.toMatchObject({
      code: 'invalid_metadata',
      warnings: [expect.objectContaining({ field: 'matricule' })],
    });
    expect(client.put).not.toHaveBeenCalled();
  });

  it('never posts if navigation cancels during preflight', async () => {
    const controller = new AbortController();
    const get = client.get.getMockImplementation()!;
    client.get.mockImplementation(async (...args: unknown[]) => {
      const result = await get(...args);
      if (args[0] === '/api/vehicles/models') controller.abort();
      return result;
    });
    const { startScan } = await import('./api');
    await expect(startScan('DOS-001', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(client.post).not.toHaveBeenCalled();
  });
});
