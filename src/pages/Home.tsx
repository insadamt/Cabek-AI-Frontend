import { useEffect } from 'react';
import { DossierCarousel } from '../components/home/DossierCarousel';
import { HomeFrame } from '../components/home/HomeFrame';
import { useNavigation } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import { isPreview, listDossiers } from '../lib/api';
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
    (signal) => listDossiers(query, signal),
    (data) =>
      !isPreview && data && data.counts.processing + data.counts.queued > 0 ? 10_000 : undefined,
  );
  const data = resource.data;
  const activeIndex = Math.min(slide - offset, Math.max(0, (data?.items.length ?? 1) - 1));

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
          offset={offset}
          onSelect={(index) => selectSlide(offset + index)}
          onStep={(direction) =>
            selectSlide((offset + activeIndex + direction + data.total) % data.total)
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
