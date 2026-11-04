/** Presents category folders without a route-loading flash; depends on prepared dossier windows and shared carousel, search and document interactions. */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { CategoryControls } from '../components/home/CategoryControls';
import { categoryPath, collectionQuery, collectionUrl, type Category } from '../lib/workflows';
import { DossierCarousel } from '../components/home/DossierCarousel';
import { HomeSearchResults } from '../components/home/HomeSearchResults';
import { HomeFrame } from '../components/home/HomeFrame';
import { useNavigation } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import { isPreview } from '../lib/api';
import { homeDossierQuery, loadHomeDossierWindow } from '../lib/homeDossiers';
import { getPreparedCollection } from '../lib/collectionPreparation';
import { finishHomeViewTransition } from '../lib/homeViewTransition';
import { enterEmptyCollection } from '../lib/pageJourneyMotion';

function HomeCarousel({ category }: { category: Category }) {
  const { searchParams } = useNavigation();
  const emptyState = useRef<HTMLDivElement>(null);
  const requestedSlide = Number(searchParams.get('slide') ?? 0);
  const slide = Number.isSafeInteger(requestedSlide) && requestedSlide >= 0 ? requestedSlide : 0;
  const query = homeDossierQuery(category, searchParams);
  const preparedKey = useRef(JSON.stringify(query));
  const prepared = useRef(
    typeof window !== 'undefined' && window.history.state?.ejectFolders
      ? getPreparedCollection(query)
      : undefined,
  );
  const resource = useResource(
    JSON.stringify(query),
    (signal) => {
      if (prepared.current && preparedKey.current === JSON.stringify(query))
        return Promise.resolve(prepared.current);
      return loadHomeDossierWindow(query, signal);
    },
    (data) =>
      !isPreview && data && data.counts.processing + data.counts.queued > 0 ? 10_000 : undefined,
  );
  const previousWindow = useRef(resource.data ?? prepared.current);
  if (resource.data) previousWindow.current = resource.data;

  useEffect(() => {
    // Initial data survives Strict Mode's repeated setup; subsequent polling and filters read the server.

    if (resource.data) prepared.current = undefined;
  }, [resource.data]);

  // Keep the prefetched neighbor mounted while its page becomes the current window.

  const data = resource.data ?? previousWindow.current;
  const activeIndex = Math.max(0, data?.indices.indexOf(slide) ?? 0);

  useLayoutEffect(() => {
    if (!data || data.items.length || !window.history.state?.ejectFolders) return;
    const scope = emptyState.current?.closest<HTMLElement>('.category-collection');
    if (!scope) return;
    const path = window.location.pathname + window.location.search;
    return enterEmptyCollection(scope, () => {
      if (path !== window.location.pathname + window.location.search) return;
      window.history.replaceState({ ...window.history.state, ejectFolders: false }, '');
    });
  }, [data]);

  function selectSlide(nextSlide: number) {
    const params = new URLSearchParams(searchParams);
    params.delete('slide');
    if (nextSlide > 0) params.set('slide', String(nextSlide));

    // Browsing replaces the selection so Back returns from a dossier to the same folder.

    window.history.replaceState(
      window.history.state,
      '',
      collectionUrl(categoryPath(category.type), params, {}),
    );
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  useEffect(() => {
    document.title = `CABEK AI — ${category.title}`;
  }, [category]);

  return (
    <>
      {data && data.items.length > 0 ? (
        <DossierCarousel
          dossiers={data.items}
          activeIndex={activeIndex}
          total={data.total}
          offset={0}
          indices={data.indices}
          onSelect={(index) => selectSlide(data.indices[index])}
          onStep={(direction) =>
            selectSlide(
              (((data.indices[activeIndex] + direction) % data.total) + data.total) % data.total,
            )
          }
        />
      ) : (
        <div ref={emptyState} className="home-state" role="status">
          {resource.error ? (
            <div role="alert">
              <p>
                {resource.error instanceof Error
                  ? resource.error.message
                  : 'Dossiers indisponibles.'}
              </p>
              <button onClick={resource.refresh}>Réessayer</button>
            </div>
          ) : resource.loading && !data ? (
            <span className="home-loading-indicator" aria-label="Chargement des dossiers" />
          ) : (
            <p>Aucun dossier</p>
          )}
        </div>
      )}
      {resource.error != null && data && (
        <button className="home-retry" onClick={resource.refresh}>
          Réessayer
        </button>
      )}
    </>
  );
}

export function Home({ category }: { category: Category }) {
  const { searchParams } = useNavigation();
  useEffect(() => () => finishHomeViewTransition(), []);

  // Presence of the query enables the grid even when an empty search requests all folders.

  const requestedOffset = Number(searchParams.get('offset') ?? 0);
  const offset =
    Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
  return (
    <HomeFrame>
      <div
        className="category-collection"
        data-category={category.type}
        data-handoff={
          typeof window !== 'undefined' && window.history.state?.ejectFolders
            ? 'pending'
            : undefined
        }
      >
        <CategoryControls category={category} />
        <div className="category-content">
          <div className="home-carousel-view" hidden={searchParams.has('search')}>
            <HomeCarousel category={category} />
          </div>
          {searchParams.has('search') && (
            <HomeSearchResults
              search={searchParams.get('search') ?? ''}
              offset={offset}
              query={collectionQuery(category, searchParams, 24)}
            />
          )}
        </div>
      </div>
    </HomeFrame>
  );
}
