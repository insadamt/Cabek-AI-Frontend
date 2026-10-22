import { ChevronLeft, ChevronRight, Images, RefreshCw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { describeError, resolveMediaUrl } from '../../lib/api';
import { getPhotoDisplayUrls } from '../../lib/photoDisplayUrls';
import type { Photo, ScanStatus } from '../../types';
import type { AnnotationMode } from '../../lib/comparisonImages';
import { PhotoComparison } from '../PhotoComparison';

interface PhotoSelection {
  photoIndex: number;
  mode: AnnotationMode;
  split: number;
}

export interface PhotoEvidenceSelection {
  photoIndex: number;
  requestId: number;
}

interface DossierPhotoWorkspaceProps {
  evidenceSelection?: PhotoEvidenceSelection;
  photos: Photo[];
  status: ScanStatus;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

const unavailablePhotoMessages: Record<ScanStatus, string> = {
  not_analyzed: 'Les photos annotées seront disponibles après l’analyse du dossier.',
  queued: 'Le dossier est en attente. Les photos annotées apparaîtront à la fin de l’analyse.',
  processing:
    'L’analyse est en cours. Les photos annotées apparaîtront une fois le résultat enregistré.',
  failed: 'L’analyse n’a pas abouti. Aucune comparaison enregistrée n’est disponible.',
  completed: 'Le résultat enregistré ne contient aucune photographie à comparer.',
};

export function DossierPhotoWorkspace({
  photos,
  status,
  loading,
  error,
  onRetry,
  evidenceSelection,
}: DossierPhotoWorkspaceProps) {
  const [selection, setSelection] = useState<PhotoSelection>({
    photoIndex: 0,
    mode: 'parts',
    split: 50,
  });
  useEffect(() => {
    if (!evidenceSelection) return;
    setSelection({ photoIndex: evidenceSelection.photoIndex, mode: 'damages', split: 50 });
  }, [evidenceSelection]);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [thumbnailLimit, setThumbnailLimit] = useState(5);
  const modeRef = useSelectionIndicator(`${selection.mode}-${photos.length > 0}`);
  const selectedIndex = Math.min(selection.photoIndex, Math.max(0, photos.length - 1));
  const photo = photos[selectedIndex];

  const thumbnailStart = Math.min(
    Math.max(0, selectedIndex - Math.floor(thumbnailLimit / 2)),
    Math.max(0, photos.length - thumbnailLimit),
  );
  const visiblePhotos = photos.slice(thumbnailStart, thumbnailStart + thumbnailLimit);

  useLayoutEffect(() => {
    const strip = thumbnailsRef.current;
    if (!strip) return;
    // Page the thumbnails to the available width so browsing never requires a scrollbar.

    const fitThumbnails = () =>
      setThumbnailLimit(Math.max(1, Math.min(7, Math.floor((strip.clientWidth + 6) / 50))));
    fitThumbnails();
    const observer = new ResizeObserver(fitThumbnails);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [photos.length]);

  function selectPhoto(photoIndex: number) {
    if (photoIndex < 0 || photoIndex >= photos.length || photoIndex === selectedIndex) return;
    setSelection((current) => ({ ...current, photoIndex, split: 50 }));
  }

  function navigatePhotosWithKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    selectPhoto(selectedIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }

  return (
    <section
      className="surface inspection-workspace"
      aria-label="Inspection des photographies"
      onKeyDown={navigatePhotosWithKeyboard}
    >
      <header className="inspection-heading">
        <div>
          <p className="eyebrow">INSPECTION VISUELLE</p>
          <h2>Les photos, en détail.</h2>
        </div>
      </header>
      {error != null && (
        <div className="notice inspection-error" role="alert">
          <div>
            <strong>Impossible de charger les photos</strong>
            <p>{describeError(error)}</p>
          </div>
          <button onClick={onRetry}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}
      {photo ? (
        <>
          <div className="viewer-toolbar inspection-toolbar">
            <div
              ref={modeRef}
              className="segmented-control"
              role="group"
              aria-label="Type d’annotation"
            >
              <span className="selection-indicator" aria-hidden="true" />
              <button
                className={selection.mode === 'parts' ? 'selected' : ''}
                aria-pressed={selection.mode === 'parts'}
                onClick={() => setSelection((current) => ({ ...current, mode: 'parts' }))}
              >
                Pièces
              </button>
              <button
                className={selection.mode === 'damages' ? 'selected' : ''}
                aria-pressed={selection.mode === 'damages'}
                onClick={() => setSelection((current) => ({ ...current, mode: 'damages' }))}
              >
                Dommages
              </button>
            </div>
            <span>Glissez la séparation pour comparer</span>
          </div>
          <PhotoComparison
            photo={photo}
            mode={selection.mode}
            split={selection.split}
            onSplitChange={(split) => setSelection((current) => ({ ...current, split }))}
          />
          <div className="inspection-photo-navigation">
            <p role="status">
              Photo <strong>{String(selectedIndex + 1).padStart(2, '0')}</strong>
              <span> / {String(photos.length).padStart(2, '0')}</span>
            </p>
            <div>
              <button
                className="icon-button"
                disabled={selectedIndex === 0}
                aria-label="Photo précédente"
                onClick={() => selectPhoto(selectedIndex - 1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="icon-button"
                disabled={selectedIndex === photos.length - 1}
                aria-label="Photo suivante"
                onClick={() => selectPhoto(selectedIndex + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div
            ref={thumbnailsRef}
            className="inspection-thumbnails"
            role="group"
            aria-label="Choisir une photographie"
          >
            {visiblePhotos.map((item, visibleIndex) => {
              const index = thumbnailStart + visibleIndex;
              return (
                <button
                  key={item.photo_id}
                  className="inspection-thumbnail"
                  aria-label={`Afficher la photo ${index + 1}`}
                  aria-pressed={index === selectedIndex}
                  onClick={() => selectPhoto(index)}
                >
                  <Images size={20} aria-hidden="true" />
                  <img
                    src={resolveMediaUrl(getPhotoDisplayUrls(item).original)}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : loading ? (
        <div className="inspection-loading" role="status" aria-label="Chargement des photographies">
          <div className="skeleton skeleton-block" />
          <p>Chargement des photographies…</p>
        </div>
      ) : error == null ? (
        <div className="inspection-empty">
          <Images size={30} strokeWidth={1.3} />
          <h3>{status === 'completed' ? 'Aucune photo disponible' : 'Comparaison à venir'}</h3>
          <p>{unavailablePhotoMessages[status]}</p>
        </div>
      ) : null}
    </section>
  );
}
