/** Minimal collection heading and disclosed server filters; depends on category rules and existing control motion. */
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useNavigation } from '../../hooks/useNavigation';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { categoryPath, collectionUrl, workflowLabels, type Category } from '../../lib/workflows';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { brandSortAvailable, describeError } from '../../lib/api';
import { useCollectionNavigation } from '../../hooks/useCollectionNavigation';
import { transitionHomeView } from '../../lib/homeViewTransition';

export function CategoryControls({ category }: { category: Category }) {
  const { pathname, searchParams, navigate } = useNavigation();
  const { busy } = useHomeAnalysis();
  const collectionNavigation = useCollectionNavigation();
  const { store, session } = useTunnelCapture(category.type);
  const [error, setError] = useState('');
  const grid = searchParams.has('search');
  const indicator = useSelectionIndicator(grid);
  function filter(changes: Record<string, string | null>) {
    navigate(collectionUrl(pathname, searchParams, { offset: null, slide: null, ...changes }));
  }

  function switchView(showGrid: boolean, collection: HTMLElement | null) {
    if (showGrid === grid) return;
    const selectedId =
      collection?.querySelector<HTMLElement>('.home-search-results')?.dataset.selectedDossierId;
    const selectedSlot =
      !showGrid && selectedId
        ? Array.from(collection?.querySelectorAll<HTMLElement>('.carousel-folder-slot') ?? []).find(
            (slot) =>
              slot.querySelector<HTMLElement>('.dossier-folder')?.dataset.dossierId === selectedId,
          )
        : undefined;

    // Capture the shared controls before navigation so search and action surfaces can morph.

    transitionHomeView(
      collectionUrl(pathname, searchParams, {
        offset: null,
        search: showGrid ? (searchParams.get('search') ?? '') : null,
        ...(selectedSlot ? { slide: selectedSlot.dataset.collectionIndex! } : {}),
      }),
      showGrid ? 'forward' : 'reverse',
    );
  }
  return (
    <div className="category-controls" inert={busy}>
      <div className="category-heading">
        <button
          className="back-link"
          onClick={(event) =>
            collectionNavigation.leavePage(
              event.currentTarget.closest('.category-collection'),
              () => navigate(`/?parcours=${category.slug}`),
            )
          }
        >
          <ArrowLeft size={15} /> Accueil
        </button>
        <h1>{category.title}</h1>
        {category.type !== 'forfait_expertise' && (
          <button
            className="button workflow-primary"
            disabled={session?.pending || session?.saving}
            onClick={(event) => {
              try {
                if (store && !store.clear()) return;
                collectionNavigation.leavePage(
                  event.currentTarget.closest('.category-collection'),
                  () =>
                    navigate(`${categoryPath(category.type)}/new`, {
                      returnTo: pathname + window.location.search,
                    }),
                );
              } catch (failure) {
                setError(describeError(failure));
              }
            }}
          >
            <Plus size={16} /> Nouveau dossier
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="category-browse-controls">
        <div className="segmented-control" ref={indicator} aria-label="Affichage des dossiers">
          <span className="selection-indicator" aria-hidden="true" />
          <button
            className={!grid ? 'selected' : ''}
            aria-pressed={!grid}
            onClick={(event) =>
              switchView(false, event.currentTarget.closest('.category-collection'))
            }
          >
            Carrousel
          </button>
          <button
            className={grid ? 'selected' : ''}
            aria-pressed={grid}
            onClick={(event) =>
              switchView(true, event.currentTarget.closest('.category-collection'))
            }
          >
            Grille
          </button>
        </div>
        <details
          className="category-filters"
          open={
            searchParams.has('workflow_status') ||
            searchParams.has('created_from') ||
            searchParams.has('created_to') ||
            searchParams.has('sort') ||
            undefined
          }
        >
          <summary>Filtrer et trier</summary>
          <div className="category-filter-fields">
            <label>
              État du dossier
              <select
                value={searchParams.get('workflow_status') ?? ''}
                onChange={(event) => filter({ workflow_status: event.target.value || null })}
              >
                <option value="">Tous</option>
                {category.statuses.map((status) => (
                  <option key={status} value={status}>
                    {workflowLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Créé à partir du
              <input
                type="date"
                value={searchParams.get('created_from') ?? ''}
                max={searchParams.get('created_to') ?? undefined}
                onChange={(event) => filter({ created_from: event.target.value || null })}
              />
            </label>
            <label>
              Créé jusqu’au
              <input
                type="date"
                value={searchParams.get('created_to') ?? ''}
                min={searchParams.get('created_from') ?? undefined}
                onChange={(event) => filter({ created_to: event.target.value || null })}
              />
            </label>
            <label>
              Trier par
              <select
                value={searchParams.get('sort') ?? 'created_at_desc'}
                onChange={(event) => filter({ sort: event.target.value })}
              >
                <option value="created_at_desc">Plus récents</option>
                <option value="created_at_asc">Plus anciens</option>
                <option value="updated_at_desc">Dernière modification</option>
                <option value="brand_asc" disabled={!brandSortAvailable}>
                  {brandSortAvailable ? 'Marque' : 'Marque · indisponible'}
                </option>
              </select>
            </label>
            <button
              className="text-link"
              onClick={() =>
                filter({ workflow_status: null, created_from: null, created_to: null, sort: null })
              }
            >
              Réinitialiser les filtres
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
