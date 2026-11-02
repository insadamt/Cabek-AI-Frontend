/** App-owned capture subscription survives navigation; depends on the durable tunnel lifecycle store. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createTunnelCaptureStore, type TunnelCaptureStore } from '../lib/tunnelCapture';

const CaptureContext = createContext<TunnelCaptureStore | null>(null);

export function TunnelCaptureProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Storage errors surface before draft creation. */
    }
    return createTunnelCaptureStore(undefined, storage);
  });
  useEffect(() => {
    store.resume();
    return () => store.stop();
  }, [store]);
  return <CaptureContext.Provider value={store}>{children}</CaptureContext.Provider>;
}

export function useTunnelCapture() {
  const store = useContext(CaptureContext);
  const session = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => null),
    () => null,
  );
  return { store, session };
}
