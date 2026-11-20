/** Poll readiness only for visible active camera panels; depends on abortable Cabek camera reads. */
import { useEffect, useState } from 'react';
import { readCameras, type CameraCatalog } from '../lib/cameraApi';
import type { PhotoPhase } from '../workflowTypes';

export function useCameras(active: boolean, phase?: PhotoPhase) {
  const [data, setData] = useState<CameraCatalog | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    setData(null);
    setError('');
    if (!active || !visible) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await readCameras(phase, controller.signal);
        if (!controller.signal.aborted) {
          setData(next);
          setError('');
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Caméras indisponibles.');
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, phase, revision, visible]);
  return { data, error, visible, refresh: () => setRevision((value) => value + 1) };
}
