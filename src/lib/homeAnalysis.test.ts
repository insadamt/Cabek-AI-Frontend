import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, readDossier, startScan } from './api';
import { waitForAnalysisDelay } from './analysisMotion';
import { runHomeScan } from './homeAnalysis';
import type { DossierResponse, ScanStatus } from '../types';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  readDossier: vi.fn(),
  startScan: vi.fn(),
}));
vi.mock('./analysisMotion', () => ({ waitForAnalysisDelay: vi.fn(() => Promise.resolve()) }));

function response(status: ScanStatus): DossierResponse {
  return { dossier_id: 'DOS-001', status, progress: null, error: null, result: null };
}

function createScan() {
  const controller = new AbortController();
  return {
    controller,
    options: {
      dossierId: 'DOS-001',
      startIfNeeded: true,
      signal: controller.signal,
      onResponse: vi.fn(),
      onConnectionMessage: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readDossier).mockReset();
  vi.mocked(startScan).mockReset();
  vi.stubGlobal('document', { hidden: false });
});
afterEach(() => vi.unstubAllGlobals());

describe('home analysis lifecycle', () => {
  it('submits one scan and reports only server responses until completion', async () => {
    const scan = createScan();
    vi.mocked(readDossier)
      .mockResolvedValueOnce(response('not_analyzed'))
      .mockResolvedValueOnce(response('processing'))
      .mockResolvedValueOnce(response('completed'));
    vi.mocked(startScan).mockResolvedValueOnce(response('queued'));
    expect((await runHomeScan(scan.options)).status).toBe('completed');
    expect(startScan).toHaveBeenCalledExactlyOnceWith('DOS-001', scan.controller.signal);
    expect(scan.options.onResponse.mock.calls.map(([value]) => value.status)).toEqual([
      'queued',
      'processing',
      'completed',
    ]);
  });

  it.each(['completed', 'queued', 'processing'] as const)(
    'never submits a scan already %s on the server',
    async (status) => {
      const scan = createScan();
      vi.mocked(readDossier)
        .mockResolvedValueOnce(response(status))
        .mockResolvedValueOnce(response('completed'));
      await runHomeScan(scan.options);
      expect(startScan).not.toHaveBeenCalled();
    },
  );

  it.each([
    new Error('Lost POST response'),
    new ApiError('scan_in_progress', 409),
    new ApiError('already_analyzed', 409),
  ])(
    'recovers an uncertain or conflicting launch through reads without another POST: %s',
    async (error) => {
      const scan = createScan();
      vi.mocked(readDossier)
        .mockResolvedValueOnce(response('not_analyzed'))
        .mockResolvedValueOnce(response('processing'))
        .mockResolvedValueOnce(response('completed'));
      vi.mocked(startScan).mockRejectedValueOnce(error);
      await runHomeScan(scan.options);
      expect(startScan).toHaveBeenCalledTimes(1);
      expect(scan.options.onConnectionMessage).toHaveBeenCalledWith('Vérification de la demande…');
    },
  );

  it('rejects an unconfirmed request without resubmitting it', async () => {
    const scan = createScan();
    vi.mocked(readDossier).mockResolvedValue(response('not_analyzed'));
    vi.mocked(startScan).mockRejectedValueOnce(new Error('Lost POST response'));
    await expect(runHomeScan(scan.options)).rejects.toThrow('La demande n’a pas été confirmée');
    expect(startScan).toHaveBeenCalledTimes(1);
  });

  it('preserves the document in the island and backs off during a dropped connection', async () => {
    const scan = createScan();
    vi.mocked(readDossier)
      .mockResolvedValueOnce(response('processing'))
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(response('completed'));
    await runHomeScan(scan.options);
    expect(waitForAnalysisDelay).toHaveBeenNthCalledWith(1, 1800, scan.controller.signal);
    expect(waitForAnalysisDelay).toHaveBeenNthCalledWith(2, 3600, scan.controller.signal);
    expect(scan.options.onConnectionMessage).toHaveBeenCalledWith(
      'Connexion interrompue · nouvelle tentative…',
    );
    expect(startScan).not.toHaveBeenCalled();
  });

  it('returns a failed server response without presenting success or retrying automatically', async () => {
    const scan = createScan();
    vi.mocked(readDossier)
      .mockResolvedValueOnce(response('processing'))
      .mockResolvedValueOnce(response('failed'));
    expect((await runHomeScan(scan.options)).status).toBe('failed');
    expect(startScan).not.toHaveBeenCalled();
  });

  it('does not turn following an existing scan into a retry when it has since failed', async () => {
    const scan = createScan();
    scan.options.startIfNeeded = false;
    vi.mocked(readDossier).mockResolvedValueOnce(response('failed'));
    expect((await runHomeScan(scan.options)).status).toBe('failed');
    expect(startScan).not.toHaveBeenCalled();
  });

  it('stops on unmount before a launch can be submitted', async () => {
    const scan = createScan();
    vi.mocked(readDossier).mockImplementationOnce(async () => {
      scan.controller.abort();
      return response('not_analyzed');
    });
    await expect(runHomeScan(scan.options)).rejects.toMatchObject({ name: 'AbortError' });
    expect(startScan).not.toHaveBeenCalled();
  });

  it('surfaces explicit launch failures without polling or retrying the POST', async () => {
    const scan = createScan();
    vi.mocked(readDossier).mockResolvedValueOnce(response('not_analyzed'));
    vi.mocked(startScan).mockRejectedValueOnce(new ApiError('no_valid_photos', 422));
    await expect(runHomeScan(scan.options)).rejects.toMatchObject({ code: 'no_valid_photos' });
    expect(readDossier).toHaveBeenCalledTimes(1);
    expect(startScan).toHaveBeenCalledTimes(1);
  });
});
