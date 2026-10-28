/** Shared scan lifecycle and island presentation; workflow eligibility is checked before any scan work. */
import { canAnalyzeDossier } from '../lib/workflows';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { describeError, failureMessage } from '../lib/api';
import { runScanAlongsidePresentation } from '../lib/homeAnalysis';
import { flyAnalysisDocument, waitForAnalysisDelay } from '../lib/analysisMotion';
import { waitForDocumentMotion } from '../lib/documentMotion';
import { prefersReducedMotion } from '../lib/motion';
import type { DossierResponse, DossierSummary, ScanStatus } from '../types';

export type AnalysisPhase =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'ingesting'
  | 'working'
  | 'returning'
  | 'stowing'
  | 'done'
  | 'error';

export interface HomeAnalysisSession {
  dossier: DossierSummary;
  phase: AnalysisPhase;
  response?: DossierResponse;
  error: string;
  receivedAt: number;
  startedAt: number;
}

const restingPhases: AnalysisPhase[] = ['idle', 'error', 'done'];

interface HomeAnalysisContextValue {
  session: HomeAnalysisSession | null;
  busy: boolean;
  beginAnalysis: (dossier: DossierSummary, folder: HTMLElement) => void;
  revealDocument: (id: string) => void;
  resolveStatus: (dossier: DossierSummary) => ScanStatus;
}

const HomeAnalysisContext = createContext<HomeAnalysisContextValue>({
  session: null,
  busy: false,
  beginAnalysis: () => {},
  revealDocument: () => {},
  resolveStatus: (dossier) => dossier.status,
});

export const useHomeAnalysis = () => useContext(HomeAnalysisContext);

export function HomeAnalysisProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<HomeAnalysisSession | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ScanStatus>>({});
  const operation = useRef<AbortController | null>(null);
  const running = useRef(false);

  useEffect(() => () => operation.current?.abort(), []);

  function updateSession(update: Partial<HomeAnalysisSession>) {
    setSession((previous) => (previous ? { ...previous, ...update } : previous));
  }

  async function runAnalysis(dossier: DossierSummary, folder: HTMLElement) {
    if (running.current || !canAnalyzeDossier(dossier)) return;
    const paper = folder.querySelector<HTMLElement>('.folder-document');
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    if (!paper || !island) return;
    running.current = true;
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    const { signal } = controller;
    const pause = (duration: number) =>
      waitForAnalysisDelay(prefersReducedMotion() ? 0 : duration, signal);
    const startedAt = performance.now();
    setSession({ dossier, phase: 'uploading', error: '', receivedAt: startedAt, startedAt });
    let failure = '';

    try {
      const response = await runScanAlongsidePresentation(
        {
          dossierId: dossier.dossier_id,
          startIfNeeded: dossier.status === 'not_analyzed' || dossier.status === 'failed',
          signal,
          onConnectionMessage: (error) => updateSession({ error }),
          onResponse: (response) => {
            updateSession({ response, error: '', receivedAt: performance.now() });
            setStatuses((previous) => ({ ...previous, [dossier.dossier_id]: response.status }));
          },
        },
        async () => {
          await pause(560);
          folder.dispatchEvent(new Event('folder-layout-settled'));
          const extraction = waitForDocumentMotion(paper, true, signal);
          updateSession({ phase: 'extracting' });
          await extraction;
          updateSession({ phase: 'ingesting' });
          if (paper.isConnected)
            await flyAnalysisDocument({ paper, island, returning: false, signal });
          updateSession({ phase: 'working' });
        },
      );
      if (response.status === 'failed')
        failure = failureMessage(response.error?.code ?? 'scan_failed');
    } catch (error) {
      if (signal.aborted) return;
      failure = describeError(error);
    }
    if (signal.aborted) return;
    try {
      updateSession({ phase: 'returning', error: failure });
      await pause(80);
      if (paper.isConnected) await flyAnalysisDocument({ paper, island, returning: true, signal });
      const stowing = waitForDocumentMotion(paper, false, signal);
      updateSession({ phase: 'stowing' });
      await stowing;
      updateSession({ phase: failure ? 'error' : 'done' });
      if (operation.current === controller) running.current = false;
      if (!failure) {
        await waitForAnalysisDelay(1400, signal);
        setSession((previous) =>
          previous?.startedAt === startedAt ? { ...previous, phase: 'idle' } : previous,
        );
      }
    } catch {
      // Unmount cancels only presentation; an accepted backend scan continues independently.
    } finally {
      if (operation.current === controller) running.current = false;
    }
  }

  const busy = !!session && !restingPhases.includes(session.phase);
  return (
    <HomeAnalysisContext.Provider
      value={{
        session,
        busy,
        beginAnalysis: (dossier, folder) => {
          void runAnalysis(dossier, folder);
        },
        revealDocument: (id) => {
          if (!running.current && session?.dossier.dossier_id === id) setSession(null);
        },
        resolveStatus: (dossier) =>
          dossier.status === 'completed'
            ? 'completed'
            : (statuses[dossier.dossier_id] ?? dossier.status),
      }}
    >
      {children}
    </HomeAnalysisContext.Provider>
  );
}
