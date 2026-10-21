import { useEffect, useRef } from 'react';
import { DossierCarousel } from '../components/home/DossierCarousel';
import { HomeFrame } from '../components/home/HomeFrame';
import { useNavigation } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import { isPreview } from '../lib/api';
import { loadHomeDossierWindow } from '../lib/homeDossiers';
import type { DossierQuery } from '../types';

const dossiersPerPage = 12;

export function Home() {
  const { searchParams } = useNavigation();
  const requestedSlide = Number(searchParams.get('slide') ?? 0);
  const slide = Number.isSafeInteger(requestedSlide) && requestedSlide >= 0 ? requestedSlide : 0;
  const offset = Math.floor(slide / dossiersPerPage) * dossiersPerPage;
  const query: DossierQuery = { search: '', status: 'all', offset, limit: dossiersPerPage };
  const resource = useResource(
    JSON.stringify(query),
    (signal) => loadHomeDossierWindow(query, signal),
    (data) =>
      !isPreview && data && data.counts.processing + data.counts.queued > 0 ? 10_000 : undefined,
  );
  const previousWindow = useRef(resource.data);
  if (resource.data) previousWindow.current = resource.data;

  // Keep the prefetched neighbor mounted while its page becomes the current window.

  const data = resource.data ?? previousWindow.current;
  const activeIndex = Math.max(0, data?.indices.indexOf(slide) ?? 0);

  function selectSlide(nextSlide: number) {
    const params = new URLSearchParams();
    if (nextSlide > 0) params.set('slide', String(nextSlide));

    // Browsing replaces the selection so Back returns from a dossier to the same folder.

    window.history.replaceState({}, '', `/${params.size ? `?${params}` : ''}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  useEffect(() => {
    document.title = 'CABEK AI — Dossiers';
  }, []);

  return (
    <HomeFrame>
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
        <div className="home-state" role="status">
          {resource.error ? (
            <button onClick={resource.refresh}>Réessayer</button>
          ) : resource.loading ? (
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
    </HomeFrame>
  );
}
