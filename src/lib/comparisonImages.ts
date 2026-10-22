import { resolveMediaUrl } from './api';
import type { Photo } from '../types';

export type AnnotationMode = 'parts' | 'damages';

export interface ComparisonImagePair {
  photoId: string;
  mode: AnnotationMode;
  originalUrl: string;
  annotationUrl: string;
}

export function preloadImage(source: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    function cleanUp() {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', cancel);
    }
    function cancel() {
      cleanUp();
      image.removeAttribute('src');
      reject(new DOMException('Aborted', 'AbortError'));
    }
    if (signal.aborted) return cancel();
    signal.addEventListener('abort', cancel, { once: true });
    image.onerror = () => {
      cleanUp();
      reject(new Error('Image unavailable'));
    };
    image.onload = async () => {
      try {
        // Decode before replacing the visible pair so a cached image cannot flash blank on paint.

        if (image.decode) await image.decode();
        signal.throwIfAborted();
        cleanUp();
        resolve();
      } catch (error) {
        cleanUp();
        reject(error);
      }
    };
    image.src = source;
  });
}

export async function preloadComparisonImages(
  photo: Photo,
  mode: AnnotationMode,
  signal: AbortSignal,
): Promise<ComparisonImagePair> {
  const originalUrl = resolveMediaUrl(photo.original_url);
  const annotationUrl = resolveMediaUrl(mode === 'parts' ? photo.parts_url : photo.damages_url);
  await Promise.all([preloadImage(originalUrl, signal), preloadImage(annotationUrl, signal)]);
  signal.throwIfAborted();
  return { photoId: photo.photo_id, mode, originalUrl, annotationUrl };
}
