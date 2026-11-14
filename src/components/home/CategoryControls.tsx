/** Minimal collection heading and disclosed server filters; depends on category rules and existing control motion. */
import { ArrowLeft, Camera, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useNavigation } from '../../hooks/useNavigation';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { categoryPath, collectionUrl, type Category } from '../../lib/workflows';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { expertiseTunnelPath } from '../../lib/expertiseCapture';
import { describeError } from '../../lib/api';
import { useCollectionNavigation } from '../../hooks/useCollectionNavigation';
import { transitionHomeView } from '../../lib/homeViewTransition';
import { CollectionFilters } from './CollectionFilters';

export function CategoryControls({ category }: { category: Category }) {
  const { pathname, searchParams, navigate } = useNavigation();
  const { busy } = useHomeAnalysis();
  const collectionNavigation = useCollectionNavigation();
  const { store, session } = useTunnelCapture(category.type);
  const [error, setError] = useState('');
  const grid = searchParams.has('search');
  const indicator = useSelectionIndicator(grid);

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
        {category.type === 'forfait_expertise' && (
          <button
            className="button workflow-primary"
            type="button"
            onClick={(event) =>
              collectionNavigation.leavePage(
                event.currentTarget.closest('.category-collection'),
                () => navigate(expertiseTunnelPath()),
              )
            }
          >
            <Camera size={16} aria-hidden="true" /> Scanner un véhicule
          </button>
        )}
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
        <CollectionFilters category={category} />
      </div>
    </div>
  );
}
