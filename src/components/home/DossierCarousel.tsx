import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { navigate } from '../../hooks/useNavigation';
import { useDossierCarousel } from '../../hooks/useDossierCarousel';
import { vehicleName } from '../../lib/format';
import type { DossierSummary } from '../../types';
import { DossierFolder } from './DossierFolder';

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
  const { gestureHandlers, progress, dragging, animating, animateStep, tilt, canSelect } =
    useDossierCarousel(onStep, total > 1);
  const [openedDossierId, setOpenedDossierId] = useState<string | null>(null);

  useEffect(() => {
    if (dragging) setOpenedDossierId(null);
  }, [dragging]);

  useEffect(() => {
    if (!openedDossierId) return;

    function returnDocumentOnOutsidePress(event: globalThis.PointerEvent) {
      const target = event.target;
      const pressedFolder = target instanceof Element ? target.closest('.dossier-folder') : null;
      if (pressedFolder?.getAttribute('data-dossier-id') !== openedDossierId) {
        setOpenedDossierId(null);
      }
    }

    document.addEventListener('pointerdown', returnDocumentOnOutsidePress);
    return () => document.removeEventListener('pointerdown', returnDocumentOnOutsidePress);
  }, [openedDossierId]);

  function browseDossiers(direction: number) {
    setOpenedDossierId(null);
    animateStep(direction);
  }

  const activeDossier = dossiers[activeIndex];
  const activePosition = indices?.[activeIndex] ?? offset + activeIndex;

  return (
    <section
      className={`dossier-carousel ${dragging ? 'carousel-dragging' : ''} ${animating || progress !== 0 ? 'carousel-tracking' : ''}`}
      aria-label="Parcourir les dossiers"
      aria-roledescription="carrousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpenedDossierId(null);
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          browseDossiers(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      <h1 className="carousel-backdrop-word">DOSSIERS</h1>
      <div
        className="carousel-stage"
        {...gestureHandlers}
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
                onRequestClose={() => setOpenedDossierId(null)}
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
      <button
        className="carousel-edge carousel-edge-previous"
        onClick={() => browseDossiers(-1)}
        disabled={total < 2}
        aria-label="Dossier précédent"
      >
        <ChevronLeft size={22} strokeWidth={1.2} />
      </button>
      <button
        className="carousel-edge carousel-edge-next"
        onClick={() => browseDossiers(1)}
        disabled={total < 2}
        aria-label="Dossier suivant"
      >
        <ChevronRight size={22} strokeWidth={1.2} />
      </button>
      <a
        className="home-open-dossier"
        href={`/dossiers/${encodeURIComponent(activeDossier.dossier_id)}`}
        aria-label={`Ouvrir le dossier ${activeDossier.dossier_id}`}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate(event.currentTarget.getAttribute('href')!);
        }}
      >
        <ArrowUpRight size={22} strokeWidth={1.2} />
      </a>
      <span className="carousel-counter" aria-live="polite">
        {String(activePosition + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </section>
  );
}
