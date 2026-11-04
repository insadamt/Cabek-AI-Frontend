/** Keeps the source visible during real data preparation, then exits before committing a ready collection; depends on abortable reads, island feedback and page journeys. */
import type { Category } from './workflows';
import { categoryPath } from './workflows';
import { prepareCollection } from './collectionPreparation';
import { absorbCategoryFolder } from './categoryFolderMotion';
import { exitPage } from './pageJourneyMotion';

interface CollectionNavigationOptions {
  category: Category;
  scope: HTMLElement;
  folder?: HTMLElement;
  beforeNavigate?: () => void;
  navigate: (path: string, state: Record<string, unknown>) => void;
  onPending: (pending: boolean) => void;
  onError: (error: unknown) => void;
}

export function navigatePreparedCollection({
  category,
  scope,
  folder,
  beforeNavigate,
  navigate,
  onPending,
  onError,
}: CollectionNavigationOptions) {
  const controller = new AbortController();
  const island = document.querySelector<HTMLElement>('.ai-activity-island');
  const previousLoading = island?.dataset.collectionLoading;
  const previousBusy = scope.getAttribute('aria-busy');
  const previousInert = scope.inert;
  const announcement = document.createElement('span');
  announcement.className = 'visually-hidden';
  announcement.setAttribute('role', 'status');
  announcement.textContent = 'Chargement des dossiers';
  island?.append(announcement);
  if (island) island.dataset.collectionLoading = 'true';
  scope.setAttribute('aria-busy', 'true');
  onPending(true);
  let finished = false;
  let cancelMotion: (() => void) | undefined;

  function clearLoading() {
    announcement.remove();
    if (island) {
      if (previousLoading === undefined) delete island.dataset.collectionLoading;
      else island.dataset.collectionLoading = previousLoading;
    }
    if (previousBusy === null) scope.removeAttribute('aria-busy');
    else scope.setAttribute('aria-busy', previousBusy);
  }
  function cleanup() {
    controller.abort();
    window.removeEventListener('popstate', cancel);
    window.removeEventListener('pagehide', cancel);
    window.removeEventListener('keydown', handleKey);
    clearLoading();
    scope.inert = previousInert;
    onPending(false);
  }
  function cancel() {
    if (finished) return;
    finished = true;
    cancelMotion?.();
    cleanup();
  }
  function handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape') cancel();
  }
  function commit() {
    if (finished) return;
    try {
      beforeNavigate?.();
    } catch (error) {
      cancel();
      onError(error);
      return;
    }
    finished = true;
    cleanup();
    navigate(categoryPath(category.type), { ejectFolders: true });
  }
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  window.addEventListener('keydown', handleKey);

  void prepareCollection(category, controller.signal)
    .then(() => {
      if (finished) return;
      clearLoading();
      scope.inert = true;
      if (folder && island) {
        const peers = Array.from(scope.querySelectorAll<HTMLElement>('.dossier-folder')).filter(
          (element) => element !== folder,
        );
        cancelMotion = absorbCategoryFolder(folder, peers, island, commit, cancel, scope);
      } else {
        cancelMotion = exitPage(scope, commit, cancel);
      }
    })
    .catch((error: unknown) => {
      if (finished) return;
      cancel();
      onError(error);
    });
  return cancel;
}
