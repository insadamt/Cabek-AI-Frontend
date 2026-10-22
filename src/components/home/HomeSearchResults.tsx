import { X } from 'lucide-react';
import { SearchReturnControl } from './SearchReturnControl';
import { useRef } from 'react';
import { transitionHomeView } from '../../lib/homeViewTransition';
import { useGridFolderSelection } from '../../hooks/useGridFolderSelection';
import { useFolderGridMotion } from '../../hooks/useFolderGridMotion';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisAction } from './AnalysisAction';
import { useResource } from '../../hooks/useResource';
import { listDossiers } from '../../lib/api';
import { SearchResultTitle } from './SearchResultTitle';
import { statusLabels } from '../../lib/format';
import { DossierFolder } from './DossierFolder';

interface HomeSearchResultsProps {
  search: string;
  offset: number;
}

export function HomeSearchResults({ search, offset }: HomeSearchResultsProps) {
  const analysis = useHomeAnalysis();
  const sectionRef = useRef<HTMLElement>(null);
  const selection = useGridFolderSelection(sectionRef);
  const { selectedFolder, documentOpen, busy } = selection;
  const resource = useResource(JSON.stringify({ search, offset }), (signal) =>
    listDossiers({ search, status: 'all', limit: 24, offset }, signal),
  );
  const previousData = useRef(resource.data);
  if (resource.data) previousData.current = resource.data;
  const data = resource.data ?? previousData.current;
  const gridRef = useFolderGridMotion(data, busy || !!selectedFolder);

  const folders = data?.items ?? [];
  const visibleFolders =
    selectedFolder && !folders.some((folder) => folder.dossier_id === selectedFolder.dossier_id)
      ? [...folders, selectedFolder]
      : folders;

  function showPage(nextOffset: number) {
    transitionHomeView(`/?${new URLSearchParams({ search, offset: String(nextOffset) })}`);
  }

  return (
    <section
      ref={sectionRef}
      className={`home-search-results ${selectedFolder ? 'has-selected-folder' : ''}`}
      aria-label="Résultats de recherche"
      onKeyDown={(event) => {
        if (!analysis.busy && event.key === 'Escape' && selectedFolder) selection.returnToGrid();
      }}
    >
      <div className="home-search-heading">
        <p role="status">
          {data ? `${data.total} dossier${data.total === 1 ? '' : 's'}` : 'Recherche…'}
        </p>
      </div>
      <div
        ref={gridRef}
        inert={busy || analysis.busy}
        aria-busy={resource.loading}
        className={`home-folder-grid ${data?.total === 1 ? 'has-single-folder' : ''}`}
      >
        {visibleFolders
          .map((folder) => ({ ...folder, status: analysis.resolveStatus(folder) }))
          .map((dossier) => (
            <article
              className="home-grid-folder"
              data-folder-id={dossier.dossier_id}
              key={dossier.dossier_id}
              hidden={!!selectedFolder && selectedFolder.dossier_id !== dossier.dossier_id}
              data-flip-id={`grid-folder-${dossier.dossier_id}`}
            >
              <div className="home-grid-folder-preview">
                <DossierFolder
                  dossier={dossier}
                  isActive
                  isOpen={selectedFolder?.dossier_id === dossier.dossier_id && documentOpen}
                  onSelect={() => selection.selectFolder(dossier)}
                  onDocumentMotionChange={
                    selectedFolder?.dossier_id === dossier.dossier_id
                      ? selection.handleDocumentMotionChange
                      : undefined
                  }
                />
              </div>
              <SearchResultTitle dossier={dossier} search={search} />
              <span className={`status-badge status-${dossier.status}`}>
                {statusLabels[dossier.status]}
              </span>
            </article>
          ))}
        {resource.error != null && <button onClick={resource.refresh}>Réessayer</button>}
        {data?.total === 0 && (
          <p className="home-search-empty">Aucun dossier ne correspond à votre recherche.</p>
        )}
      </div>
      {!selectedFolder && data && data.total > data.limit && (
        <nav className="home-search-pagination" aria-label="Pages des résultats">
          <button
            disabled={offset === 0}
            onClick={() => showPage(Math.max(0, offset - data.limit))}
          >
            Précédent
          </button>
          <span>
            {Math.floor(offset / data.limit) + 1} / {Math.ceil(data.total / data.limit)}
          </span>
          <button
            disabled={offset + data.limit >= data.total}
            onClick={() => showPage(offset + data.limit)}
          >
            Suivant
          </button>
        </nav>
      )}
      <div className="home-search-controls">
        <SearchReturnControl
          search={search}
          focused={!!selectedFolder}
          disabled={busy || analysis.busy}
          onReturn={selection.returnToGrid}
        />
        {selectedFolder ? (
          <AnalysisAction
            className="home-selected-action"
            dossier={selectedFolder}
            disabled={busy}
          />
        ) : (
          <button
            className="home-clear-search"
            data-flip-id="home-action"
            type="button"
            disabled={busy}
            onClick={() => transitionHomeView('/', 'reverse')}
          >
            <X size={18} aria-hidden="true" /> Effacer
          </button>
        )}
      </div>
    </section>
  );
}
