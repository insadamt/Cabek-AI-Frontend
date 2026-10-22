import { flushSync } from 'react-dom';
import { navigate } from '../hooks/useNavigation';
import type { DossierSummary } from '../types';
import { waitForDocumentMotion } from './documentMotion';

export interface DossierEntrance {
  dossier: DossierSummary;
  folderBounds: { left: number; top: number; width: number; height: number };
}

interface OpenDossierOptions {
  dossier: DossierSummary;
  folder: HTMLElement;
  path: string;
}

let pendingNavigation: AbortController | null = null;

export async function openDossierFromFolder({ dossier, folder, path }: OpenDossierOptions) {
  if (pendingNavigation) return;
  const controller = new AbortController();
  pendingNavigation = controller;
  const scope = folder.closest('section');
  const previousInert = scope?.inert ?? false;
  const cancel = () => controller.abort();
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  if (scope) scope.inert = true;

  try {
    const paper = folder.querySelector<HTMLElement>('.folder-document');
    // Listen before closing because reduced motion can finish insertion synchronously.

    const insertion = paper
      ? waitForDocumentMotion(paper, false, controller.signal)
      : Promise.resolve();
    flushSync(() => folder.dispatchEvent(new Event('dossier-navigation-start')));
    await insertion;
    if (controller.signal.aborted || !folder.isConnected) return;
    const { left, top, width, height } = folder.getBoundingClientRect();
    const entrance: DossierEntrance = { dossier, folderBounds: { left, top, width, height } };
    window.removeEventListener('popstate', cancel);
    navigate(path, { dossierEntrance: entrance });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
  } finally {
    window.removeEventListener('popstate', cancel);
    window.removeEventListener('pagehide', cancel);
    if (scope) scope.inert = previousInert;
    if (controller.signal.aborted) folder.dispatchEvent(new Event('dossier-navigation-cancel'));
    pendingNavigation = null;
  }
}
