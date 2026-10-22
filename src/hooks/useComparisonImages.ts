import { useEffect, useState } from 'react';
import {
  preloadComparisonImages,
  type AnnotationMode,
  type ComparisonImagePair,
} from '../lib/comparisonImages';
import type { Photo } from '../types';

interface ComparisonState {
  requestKey: string;
  displayed?: ComparisonImagePair;
  previous?: ComparisonImagePair;
  error: boolean;
}

export function useComparisonImages(photo: Photo, mode: AnnotationMode) {
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([photo, mode, retry]);
  const [state, setState] = useState<ComparisonState>({ requestKey: '', error: false });

  useEffect(() => {
    const controller = new AbortController();
    void preloadComparisonImages(photo, mode, controller.signal).then(
      (displayed) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            requestKey,
            displayed,
            previous: previous.displayed,
            error: false,
          }));
      },
      () => {
        if (!controller.signal.aborted) {
          controller.abort();
          setState((previous) => ({ ...previous, requestKey, error: true }));
        }
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  useEffect(() => {
    if (!state.previous) return;
    const timer = window.setTimeout(
      () => setState((previous) => ({ ...previous, previous: undefined })),
      220,
    );
    return () => window.clearTimeout(timer);
  }, [state.displayed]);

  return {
    ...state,
    error: state.requestKey === requestKey && state.error,
    ready: state.requestKey === requestKey && !state.error,
    retryImages: () => setRetry((value) => value + 1),
  };
}
