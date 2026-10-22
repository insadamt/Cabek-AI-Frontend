import type { DossierSummary } from '../types';

export type DossierOpeningPhase =
  'extracting' | 'ingesting' | 'loading' | 'returning' | 'stowing' | 'error';

export interface DossierOpeningSession {
  dossier: DossierSummary;
  phase: DossierOpeningPhase;
  loaded: number;
  total: number;
  error: string;
  retry: () => void;
  cancel: () => void;
}

let session: DossierOpeningSession | null = null;
const listeners = new Set<() => void>();

export function getDossierOpening() {
  return session;
}
export function subscribeToDossierOpening(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function publishDossierOpening(next: DossierOpeningSession | null) {
  session = next;
  listeners.forEach((listener) => listener());
}
export function updateDossierOpening(update: Partial<DossierOpeningSession>) {
  if (session) publishDossierOpening({ ...session, ...update });
}
