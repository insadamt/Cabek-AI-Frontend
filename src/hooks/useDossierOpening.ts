import { useSyncExternalStore } from 'react';
import { getDossierOpening, subscribeToDossierOpening } from '../lib/dossierOpeningState';

export function useDossierOpening() {
  return useSyncExternalStore(subscribeToDossierOpening, getDossierOpening, () => null);
}
