/** Inspect photos with a complete horizontal gallery; depends on decoded comparisons and native scrolling. */
import { ChevronLeft, ChevronRight, Images, RefreshCw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { describeError, resolveMediaUrl } from '../../lib/api';
import { getOriginalPhotoDisplayUrl } from '../../lib/photoDisplayUrls';
import type { OriginalPhoto, Photo, ScanStatus } from '../../types';
import type { AnnotationMode } from '../../lib/comparisonImages';
import { PhotoComparison } from '../PhotoComparison';
import { OriginalPhotoPreview } from './OriginalPhotoPreview';

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
  photos: (OriginalPhoto | Photo)[];
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
  const selectedIndex = Math.min(selection.photoIndex, Math.max(0, photos.length - 1));
  const photo = photos[selectedIndex];
  const annotatedPhoto =
    photo && 'parts_url' in photo && 'damages_url' in photo ? photo : undefined;
  const modeRef = useSelectionIndicator(`${selection.mode}-${!!annotatedPhoto}`);

  useLayoutEffect(() => {
    const strip = thumbnailsRef.current;
    const selectedThumbnail = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !selectedThumbnail) return;

    // Scroll only the gallery so navigating photos does not move the dossier page.

    const thumbnailStart = selectedThumbnail.offsetLeft;
    const thumbnailEnd = thumbnailStart + selectedThumbnail.offsetWidth;
    const edgePadding = 4;
    if (thumbnailStart < strip.scrollLeft + edgePadding) {
      strip.scrollLeft = Math.max(0, thumbnailStart - edgePadding);
    } else if (thumbnailEnd > strip.scrollLeft + strip.clientWidth - edgePadding) {
      strip.scrollLeft = thumbnailEnd - strip.clientWidth + edgePadding;
    }
  }, [selectedIndex, photos.length, evidenceSelection?.requestId]);

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
          <h2>Photos du véhicule</h2>
          {annotatedPhoto && <p className="inspection-hint">Glissez la séparation pour comparer</p>}
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
            {annotatedPhoto ? (
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
            ) : (
              <span className="inspection-original-label">Photographies originales</span>
            )}
            <div className="inspection-photo-navigation">
              <p role="status">
                {photo.camera_name && (
                  <span>
                    {photo.capture_source === 'demo' ? 'Démonstration · ' : ''}
                    {photo.camera_name} ·{' '}
                  </span>
                )}
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
          </div>
          {annotatedPhoto ? (
            <PhotoComparison
              photo={annotatedPhoto}
              mode={selection.mode}
              split={selection.split}
              onSplitChange={(split) => setSelection((current) => ({ ...current, split }))}
            />
          ) : (
            <OriginalPhotoPreview key={getOriginalPhotoDisplayUrl(photo)} photo={photo} />
          )}
          <div
            ref={thumbnailsRef}
            className="inspection-thumbnails"
            role="group"
            aria-label="Choisir une photographie"
          >
            {photos.map((item, index) => (
              <button
                key={item.photo_id}
                className="inspection-thumbnail"
                aria-label={`Afficher la photo ${index + 1}`}
                aria-pressed={index === selectedIndex}
                onClick={() => selectPhoto(index)}
              >
                <Images size={20} aria-hidden="true" />
                <img
                  src={resolveMediaUrl(getOriginalPhotoDisplayUrl(item))}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </button>
            ))}
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
