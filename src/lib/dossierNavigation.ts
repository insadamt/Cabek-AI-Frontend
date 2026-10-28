/** Coordinates real image loading and physical folder opening; preserves the originating collection URL. */
import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';
import type { DossierResponse, DossierSummary } from '../types';
import { describeError } from './api';
import { flyAnalysisDocument } from './analysisMotion';
import { prepareDossierImages } from './dossierImages';
import { flyDossierPhotos } from './dossierPhotoMotion';
import { publishDossierOpening, updateDossierOpening } from './dossierOpeningState';
import { waitForDocumentMotion } from './documentMotion';

export interface DossierEntrance {
  dossier: DossierSummary;
  response?: DossierResponse;
  folderBounds: { left: number; top: number; width: number; height: number };
}

interface OpenDossierOptions {
  dossier: DossierSummary;
  folder: HTMLElement;
  path: string;
}

let pendingNavigation: AbortController | null = null;

async function stowDocument(folder: HTMLElement, paper: HTMLElement | null, signal: AbortSignal) {
  const insertion = paper ? waitForDocumentMotion(paper, false, signal) : Promise.resolve();
  flushSync(() => {
    updateDossierOpening({ phase: 'stowing' });
    folder.dispatchEvent(new Event('dossier-navigation-start'));
  });
  await insertion;
}

export async function openDossierFromFolder(options: OpenDossierOptions) {
  if (pendingNavigation) return;
  const { dossier, folder, path } = options;
  const controller = new AbortController();
  pendingNavigation = controller;
  const { signal } = controller;
  const imageLoading = new AbortController();
  const cancelImageLoading = () => imageLoading.abort();
  signal.addEventListener('abort', cancelImageLoading, { once: true });
  const scope = folder.closest('section');
  const previousInert = scope?.inert ?? false;
  const previousPlaybackRate = folder.style.getPropertyValue('--document-playback-rate');
  folder.style.setProperty('--document-playback-rate', '1.5');
  const paper = folder.querySelector<HTMLElement>('.folder-document');
  let island: HTMLElement | null = null;
  let paperInIsland = false;
  const cancel = () => {
    controller.abort();
    publishDossierOpening(null);
    folder.dispatchEvent(new Event('dossier-navigation-cancel'));
  };
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  if (scope) scope.inert = true;

  // Network work starts before presentation and adds no artificial minimum loading duration.

  const prepared = prepareDossierImages({
    dossierId: dossier.dossier_id,
    signal: imageLoading.signal,
    onProgress: (loaded, total) => {
      if (!signal.aborted && !imageLoading.signal.aborted) updateDossierOpening({ loaded, total });
    },
  }).then(
    (response) => ({ response, error: undefined }),
    (error: unknown) => ({ response: undefined, error }),
  );

  try {
    const extraction = paper ? waitForDocumentMotion(paper, true, signal) : Promise.resolve();
    flushSync(() => {
      folder.dispatchEvent(new Event('dossier-navigation-cancel'));
      publishDossierOpening({
        dossier,
        phase: 'extracting',
        loaded: 0,
        total: 0,
        error: '',
        retry: () => {
          void openDossierFromFolder(options);
        },
        cancel,
      });
    });
    folder.dispatchEvent(new Event('folder-layout-settled'));
    island = document.querySelector<HTMLElement>('.ai-activity-island');
    await extraction;
    signal.throwIfAborted();
    flushSync(() => updateDossierOpening({ phase: 'ingesting' }));
    if (paper && island)
      await flyAnalysisDocument({ paper, island, returning: false, signal, playbackRate: 2 });
    paperInIsland = !!paper && !!island;
    updateDossierOpening({ phase: 'loading' });
    const result = await prepared;
    signal.throwIfAborted();
    if (result.error !== undefined) throw result.error;
    const response = result.response!;

    flushSync(() => updateDossierOpening({ phase: 'returning' }));
    // Return document and photos together rather than adding a second serial animation.

    await Promise.all([
      paper && island
        ? flyAnalysisDocument({ paper, island, returning: true, signal, playbackRate: 2 })
        : Promise.resolve(),
      island
        ? flyDossierPhotos({
            folder,
            island,
            photos: response.result?.photos ?? response.photos ?? [],
            signal,
          })
        : Promise.resolve(),
    ]);
    paperInIsland = false;
    await stowDocument(folder, paper, signal);
    signal.throwIfAborted();
    if (!folder.isConnected) {
      cancel();
      return;
    }
    const { left, top, width, height } = folder.getBoundingClientRect();
    const entrance: DossierEntrance = {
      dossier,
      response,
      folderBounds: { left, top, width, height },
    };
    window.removeEventListener('popstate', cancel);
    publishDossierOpening(null);
    navigate(path, {
      dossierEntrance: entrance,
      returnTo: window.location.pathname + window.location.search,
    });
  } catch (error) {
    imageLoading.abort();
    if (signal.aborted) return;
    try {
      if (paperInIsland && paper && island) {
        flushSync(() => updateDossierOpening({ phase: 'returning', error: describeError(error) }));
        await flyAnalysisDocument({ paper, island, returning: true, signal, playbackRate: 2 });
      }
      await stowDocument(folder, paper, signal);
      if (!signal.aborted) updateDossierOpening({ phase: 'error', error: describeError(error) });
    } catch {
      if (!signal.aborted) updateDossierOpening({ phase: 'error', error: describeError(error) });
    }
  } finally {
    window.removeEventListener('popstate', cancel);
    window.removeEventListener('pagehide', cancel);
    signal.removeEventListener('abort', cancelImageLoading);
    imageLoading.abort();
    if (scope) scope.inert = previousInert;
    if (previousPlaybackRate)
      folder.style.setProperty('--document-playback-rate', previousPlaybackRate);
    else folder.style.removeProperty('--document-playback-rate');
    pendingNavigation = null;
  }
}
