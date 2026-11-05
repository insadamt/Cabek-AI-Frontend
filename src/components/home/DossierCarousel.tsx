/** Presents browsable dossier folders with grouped navigation and search; depends on shared carousel gestures, analysis actions and collection handoff motion. */
import { useCollectionEjection } from '../../hooks/useCollectionEjection';
import { currentCollectionUrl } from '../../lib/workflows';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisAction } from './AnalysisAction';
import { DossierActions } from '../dossier/DossierActions';
import { useDossierCarousel } from '../../hooks/useDossierCarousel';
import { transitionHomeView } from '../../lib/homeViewTransition';
import { vehicleName } from '../../lib/format';
import { getVisibleDossierNumber } from '../../lib/carousel';
import type { DossierSummary } from '../../types';
import { DossierFolder } from './DossierFolder';
import { AnimatedText } from '../AnimatedText';

interface DossierCarouselProps {
  dossiers: DossierSummary[];
  activeIndex: number;
  total: number;
  offset: number;
  indices?: number[];
  onSelect: (index: number) => void;
  onStep: (direction: number) => void;
}

function getRelativePosition(index: number, activeIndex: number, count: number) {
  const position = index - activeIndex;
  return ((((position + count / 2) % count) + count) % count) - count / 2;
}

export function DossierCarousel({
  dossiers,
  activeIndex,
  total,
  offset,
  indices,
  onSelect,
  onStep,
}: DossierCarouselProps) {
  const analysis = useHomeAnalysis();
  const collectionRef = useCollectionEjection(dossiers.length);
  const {
    gestureHandlers,
    progress,
    dragging,
    animating,
    animateStep,
    stopMotion,
    tilt,
    canSelect,
  } = useDossierCarousel(onStep, total > 1, (steps, event) => {
    const tappedPosition = getVisibleDossierNumber(activePosition, steps, total) - 1;
    const tappedIndex = indices ? indices.indexOf(tappedPosition) : tappedPosition - offset;
    const tappedDossier = dossiers[tappedIndex];
    if (!tappedDossier) return;
    const folder = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('.dossier-folder'),
    ).find((element) => element.dataset.dossierId === tappedDossier.dossier_id);
    if (!folder) return;
    const bounds = folder.getBoundingClientRect();
    if (
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    ) {
      setOpenedDossierId(tappedDossier.dossier_id);
    }
  });
  const [openedDossierId, setOpenedDossierId] = useState<string | null>(null);

  useEffect(() => {
    if (dragging) setOpenedDossierId(null);
  }, [dragging]);

  useEffect(() => {
    if (!openedDossierId || analysis.busy) return;

    function returnDocumentOnOutsidePress(event: globalThis.PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-flip-id="home-action"]')) return;
      const pressedFolder = target instanceof Element ? target.closest('.dossier-folder') : null;
      if (pressedFolder?.getAttribute('data-dossier-id') !== openedDossierId) {
        setOpenedDossierId(null);
      }
    }

    document.addEventListener('pointerdown', returnDocumentOnOutsidePress);
    return () => document.removeEventListener('pointerdown', returnDocumentOnOutsidePress);
  }, [openedDossierId, analysis.busy]);

  function browseDossiers(direction: number) {
    setOpenedDossierId(null);
    animateStep(direction);
  }

  const activePosition = indices?.[activeIndex] ?? offset + activeIndex;
  const visibleDossierNumber = getVisibleDossierNumber(activePosition, progress, total);
  const visibleDossierIndex = indices
    ? indices.indexOf(visibleDossierNumber - 1)
    : visibleDossierNumber - 1 - offset;
  const visibleDossier = dossiers[visibleDossierIndex];

  return (
    <section
      ref={collectionRef}
      className={`dossier-carousel ${dragging ? 'carousel-dragging' : ''} ${animating || progress !== 0 ? 'carousel-tracking' : ''}`}
      aria-label="Parcourir les dossiers"
      aria-roledescription="carrousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (analysis.busy) return;
        if (event.key === 'Escape') setOpenedDossierId(null);
        if (event.target instanceof Element && event.target.closest('input, button, a, select'))
          return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          browseDossiers(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      <div
        className="carousel-stage"
        {...(analysis.busy ? {} : gestureHandlers)}
        inert={analysis.busy}
        style={
          {
            '--folder-tilt-x': `${tilt.x}deg`,
            '--folder-tilt-y': `${tilt.y}deg`,
          } as CSSProperties
        }
      >
        {dossiers.map((dossier, index) => {
          const position = getRelativePosition(
            indices?.[index] ?? offset + index,
            activePosition + progress,
            total,
          );
          if (Math.abs(position) > 1.8) return null;
          return (
            <div
              key={dossier.dossier_id}
              role="group"
              data-collection-index={indices?.[index] ?? offset + index}
              className={`carousel-folder-slot ${index === activeIndex ? 'is-active' : ''}`}
              style={
                {
                  '--folder-position': position,
                  '--folder-distance': Math.min(Math.abs(position), 1),
                  zIndex: Math.round(10 - Math.abs(position) * 3),
                } as CSSProperties
              }
              aria-label={`Sélectionner ${vehicleName(dossier.vehicle)}, ${dossier.dossier_id}`}
            >
              <DossierFolder
                dossier={dossier}
                isActive={index === activeIndex && !dragging && !animating}
                isOpen={
                  openedDossierId === dossier.dossier_id &&
                  index === activeIndex &&
                  !dragging &&
                  !animating
                }
                onSelect={() => {
                  if (index !== activeIndex || dragging || animating || !canSelect()) return;
                  onSelect(index);
                  setOpenedDossierId(dossier.dossier_id);
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="carousel-navigation" role="group" aria-label="Navigation des dossiers">
        <button
          className="carousel-edge carousel-edge-previous"
          onClick={() => browseDossiers(-1)}
          disabled={total < 2 || analysis.busy}
          aria-label="Dossier précédent"
        >
          <ChevronLeft size={20} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="carousel-counter" aria-live="polite" aria-atomic="true">
          <AnimatedText text={String(visibleDossierNumber).padStart(2, '0')} /> /{' '}
          {String(total).padStart(2, '0')}
        </span>
        <button
          className="carousel-edge carousel-edge-next"
          onClick={() => browseDossiers(1)}
          disabled={total < 2 || analysis.busy}
          aria-label="Dossier suivant"
        >
          <ChevronRight size={20} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
      <div className="home-bottom-bar">
        <form
          className="home-folder-search"
          data-flip-id="home-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (analysis.busy) return;
            const search = String(new FormData(event.currentTarget).get('search') ?? '').trim();

            // The carousel stays mounted during search, so reset its field before Clear reveals it.

            event.currentTarget.reset();
            transitionHomeView(currentCollectionUrl({ search, offset: null }));
          }}
        >
          <Search size={17} aria-hidden="true" />
          <input
            disabled={analysis.busy}
            name="search"
            type="search"
            aria-label="Rechercher un dossier"
            placeholder="Rechercher un dossier…"
          />
          <button type="submit" aria-label="Rechercher">
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </form>
        <AnalysisAction
          className="home-open-dossier"
          dossier={visibleDossier}
          beforeActivate={() => {
            // Commit the visible folder before launching so a settling swipe cannot change the target.

            stopMotion();
            onSelect(visibleDossierIndex);
          }}
        />
        {visibleDossier && (
          <DossierActions
            key={visibleDossier.dossier_id}
            dossier={visibleDossier}
            disabled={analysis.busy || dragging || animating}
            onDeleted={() => {
              setOpenedDossierId(null);
              onStep(-activePosition);
            }}
          />
        )}
      </div>
    </section>
  );
}
