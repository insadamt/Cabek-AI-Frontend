import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CSSProperties } from 'react';
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
  onSelect: (index: number) => void;
  onStep: (direction: number) => void;
}

function getRelativePosition(
  index: number,
  activeIndex: number,
  count: number,
  isEntireCollection: boolean,
) {
  let position = index - activeIndex;
  if (isEntireCollection && position > count / 2) position -= count;
  if (isEntireCollection && position < -count / 2) position += count;
  return position;
}

export function DossierCarousel({
  dossiers,
  activeIndex,
  total,
  offset,
  onSelect,
  onStep,
}: DossierCarouselProps) {
  const { gestureHandlers, dragDistance, tilt, canSelect } = useDossierCarousel(onStep);
  const activeDossier = dossiers[activeIndex];

  return (
    <section
      className={`dossier-carousel ${dragDistance ? 'carousel-dragging' : ''}`}
      aria-label="Parcourir les dossiers"
      aria-roledescription="carrousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          onStep(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      <h1 className="carousel-backdrop-word">DOSSIERS</h1>
      <div
        className="carousel-stage"
        {...gestureHandlers}
        style={
          {
            '--drag-distance': `${dragDistance}px`,
            '--folder-tilt-x': `${tilt.x}deg`,
            '--folder-tilt-y': `${tilt.y}deg`,
          } as CSSProperties
        }
      >
        {dossiers.map((dossier, index) => {
          const position = getRelativePosition(
            index,
            activeIndex,
            dossiers.length,
            dossiers.length === total,
          );
          if (Math.abs(position) > 1) return null;
          return (
            <button
              key={dossier.dossier_id}
              type="button"
              className={`carousel-folder-slot ${position === 0 ? 'is-active' : ''}`}
              style={
                { '--folder-position': position, zIndex: 3 - Math.abs(position) } as CSSProperties
              }
              aria-label={`Sélectionner ${vehicleName(dossier.vehicle)}, ${dossier.dossier_id}`}
              aria-pressed={position === 0}
              tabIndex={position === 0 ? 0 : -1}
              onClick={() => {
                if (canSelect()) onSelect(index);
              }}
            >
              <DossierFolder dossier={dossier} />
            </button>
          );
        })}
      </div>
      <button
        className="carousel-edge carousel-edge-previous"
        onClick={() => onStep(-1)}
        disabled={total < 2}
        aria-label="Dossier précédent"
      >
        <ChevronLeft size={22} strokeWidth={1.2} />
      </button>
      <button
        className="carousel-edge carousel-edge-next"
        onClick={() => onStep(1)}
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
        {String(offset + activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </section>
  );
}
