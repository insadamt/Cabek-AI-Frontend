/**
 * Owns one studio runtime cache for the application's lifetime while route-specific frames unmount normally.
 * Depends on bayRuntimeCache and React context; true app teardown releases retained GPU resources.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createBayRuntimeCache, type BayRuntimeCache } from '../scanner/bayRuntimeCache';

const CacheContext = createContext<BayRuntimeCache | null>(null);

export function BayRuntimeCacheProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(createBayRuntimeCache);
  useEffect(() => () => cache.dispose(), [cache]);
  return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>;
}

export function useBayRuntimeCache() {
  const cache = useContext(CacheContext);
  if (!cache) throw new Error('The studio requires its application runtime cache.');
  return cache;
}
