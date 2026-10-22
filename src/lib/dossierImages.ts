import { readDossier, resolveMediaUrl } from './api';
import { preloadImage } from './comparisonImages';
import { retainPreparedImages } from './preparedImages';
import { getPhotoDisplayUrls } from './photoDisplayUrls';

interface PrepareDossierOptions {
  dossierId: string;
  signal: AbortSignal;
  onProgress: (loaded: number, total: number) => void;
}

export async function prepareDossierImages({
  dossierId,
  signal,
  onProgress,
}: PrepareDossierOptions) {
  const response = await readDossier(dossierId, signal);
  signal.throwIfAborted();
  const urls = [
    ...new Set(
      (response.result?.photos ?? []).flatMap((photo) => {
        const displayUrls = getPhotoDisplayUrls(photo);
        return [displayUrls.original, displayUrls.parts, displayUrls.damages].map(resolveMediaUrl);
      }),
    ),
  ];
  const images = new Map<string, HTMLImageElement>();
  const loading = new AbortController();
  const cancel = () => loading.abort();
  signal.addEventListener('abort', cancel, { once: true });
  let loaded = 0;
  onProgress(0, urls.length);
  try {
    // Start every visible variant together so later photos do not wait behind a request queue.

    await Promise.all(
      urls.map(async (source) => {
        const image = await preloadImage(source, loading.signal);
        images.set(source, image);
        onProgress(++loaded, urls.length);
      }),
    );
    signal.throwIfAborted();
    retainPreparedImages(images);
    return response;
  } catch (error) {
    loading.abort();
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError'))
      throw error;
    throw new Error('Une image n’a pas pu être chargée. Réessayez.');
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
