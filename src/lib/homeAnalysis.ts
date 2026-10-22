import { ApiError, readDossier, startScan } from './api';
import { waitForAnalysisDelay } from './analysisMotion';
import type { DossierResponse } from '../types';

interface RunHomeScanOptions {
  dossierId: string;
  signal: AbortSignal;
  startIfNeeded: boolean;
  onResponse: (response: DossierResponse) => void;
  onConnectionMessage: (message: string) => void;
}

export async function runScanAlongsidePresentation(
  options: RunHomeScanOptions,
  presentDocument: () => Promise<void>,
) {
  // Attach both handlers immediately: a fast API failure must not become an unhandled rejection.

  const outcome = runHomeScan(options).then(
    (response) => ({ response }),
    (error: unknown) => ({ error }),
  );
  await presentDocument();
  const result = await outcome;
  if ('error' in result) throw result.error;
  return result.response;
}

export async function runHomeScan({
  dossierId,
  signal,
  startIfNeeded,
  onResponse,
  onConnectionMessage,
}: RunHomeScanOptions) {
  // Read first: stale folder summaries must never submit a second completed scan.

  let response: DossierResponse | undefined = await readDossier(dossierId, signal);
  signal.throwIfAborted();
  if (startIfNeeded && (response.status === 'not_analyzed' || response.status === 'failed')) {
    try {
      response = await startScan(dossierId, signal);
    } catch (error) {
      signal.throwIfAborted();
      if (
        error instanceof ApiError &&
        !['scan_in_progress', 'already_analyzed'].includes(error.code)
      )
        throw error;

      // A lost POST response may still mean acceptance; recover with reads, never another POST.

      onConnectionMessage('Vérification de la demande…');
      response = undefined;
    }
  }
  let readFailures = 0;
  while (true) {
    signal.throwIfAborted();
    if (response) {
      onResponse(response);
      if (response.status === 'completed' || response.status === 'failed') return response;
      if (response.status === 'not_analyzed') {
        throw new Error(
          'La demande n’a pas été confirmée. Ouvrez le dossier pour vérifier son état.',
        );
      }
    }
    await waitForAnalysisDelay(
      document.hidden ? 10_000 : Math.min(1800 * 2 ** readFailures, 15_000),
      signal,
    );
    try {
      response = await readDossier(dossierId, signal);
      readFailures = 0;
    } catch {
      signal.throwIfAborted();
      readFailures = Math.min(readFailures + 1, 3);
      response = undefined;
      onConnectionMessage('Connexion interrompue · nouvelle tentative…');
    }
  }
}
