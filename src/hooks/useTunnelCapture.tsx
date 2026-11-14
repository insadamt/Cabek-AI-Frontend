/** App-owned capture subscription survives navigation; depends on the durable tunnel lifecycle store. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createWorkflowCaptureStores } from '../lib/workflowCaptureStores';
import { useNavigation } from './useNavigation';
import type { DossierType } from '../workflowTypes';

const CaptureContext = createContext<ReturnType<typeof createWorkflowCaptureStores> | null>(null);

const CaptureRouteContext = createContext<DossierType | undefined>(undefined);

export function TunnelCaptureProvider({ children }: { children: ReactNode }) {
  const { pathname, searchParams } = useNavigation();
  const routeType =
    pathname.startsWith('/categories/verification') ||
    searchParams.get('parcours') === 'verification'
      ? 'verification'
      : pathname.startsWith('/categories/chiffrage-rapide') ||
          searchParams.get('parcours') === 'chiffrage-rapide'
        ? 'chiffrage_rapide'
        : pathname.startsWith('/categories/forfait-expertise') ||
            searchParams.get('parcours') === 'forfait-expertise'
          ? 'forfait_expertise'
          : undefined;
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Storage errors surface before draft creation. */
    }
    return createWorkflowCaptureStores(storage);
  });
  useEffect(() => {
    Object.values(store.stores).forEach((workflow) => workflow.resume());
    return () => Object.values(store.stores).forEach((workflow) => workflow.stop());
  }, [store]);
  return (
    <CaptureContext.Provider value={store}>
      <CaptureRouteContext.Provider value={routeType}>{children}</CaptureRouteContext.Provider>
    </CaptureContext.Provider>
  );
}

export function useTunnelCapture(type?: DossierType) {
  const registry = useContext(CaptureContext);
  const routeType = useContext(CaptureRouteContext);
  const activeType = useSyncExternalStore(
    registry?.subscribe ?? (() => () => {}),
    registry?.getActiveType ?? (() => 'chiffrage_rapide' as const),
    () => 'chiffrage_rapide' as const,
  );
  const selectedType = type ?? routeType ?? activeType;
  const store = registry?.stores[selectedType] ?? null;
  const session = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => null),
    () => null,
  );
  return { store, session };
}
