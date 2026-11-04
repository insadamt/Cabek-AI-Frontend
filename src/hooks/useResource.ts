import { useCallback, useEffect, useRef, useState } from 'react';

interface ResourceState<T> {
  key: string;
  data?: T;
  error: unknown;
  loading: boolean;
}

export function useResource<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  pollInterval?: (data?: T) => number | undefined,
) {
  const [state, setState] = useState<ResourceState<T>>({ key, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  const loaderRef = useRef(loader);
  const pollRef = useRef(pollInterval);
  loaderRef.current = loader;
  pollRef.current = pollInterval;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const replaceData = useCallback(
    (data: T) => setState({ key, data, error: null, loading: false }),
    [key],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let latestData: T | undefined;

    async function load() {
      setState((previous) => ({
        key,
        data: previous.key === key ? previous.data : undefined,
        error: null,
        loading: true,
      }));
      try {
        const data = await loaderRef.current(controller.signal);
        if (controller.signal.aborted) return;
        latestData = data;
        failures = 0;
        setState({ key, data, error: null, loading: false });
        const interval = pollRef.current?.(data);
        if (interval)
          timer = setTimeout(load, document.hidden ? Math.max(interval, 15_000) : interval);
      } catch (error) {
        if (controller.signal.aborted) return;
        failures += 1;
        setState((previous) => ({
          key,
          data: previous.key === key ? previous.data : latestData,
          error,
          loading: false,
        }));
        if (failures < 5) timer = setTimeout(load, Math.min(2000 * 2 ** failures, 30_000));
      }
    }

    void load();
    const onFocus = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('cabek:dossiers-changed', refresh);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cabek:dossiers-changed', refresh);
    };
  }, [key, revision, refresh]);

  return {
    ...(state.key === key ? state : { key, data: undefined, error: null, loading: true }),
    refresh,
    replaceData,
  };
}
