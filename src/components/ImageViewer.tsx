import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Photo } from '../types';
import { Modal } from './Modal';
import { PhotoComparison } from './PhotoComparison';
import { useSelectionIndicator } from '../hooks/useSelectionIndicator';

export function ImageViewer({ photos, onClose }: { photos: Photo[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'parts' | 'damages'>('parts');
  const [split, setSplit] = useState(50);
  const photo = photos[index];
  const modeRef = useSelectionIndicator(mode);

  function changePhoto(nextIndex: number) {
    setIndex(nextIndex);
    setSplit(50);
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
        return;
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        changePhoto(index - 1);
      }
      if (event.key === 'ArrowRight' && index < photos.length - 1) {
        event.preventDefault();
        changePhoto(index + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, photos.length]);

  return (
    <Modal title="Un autre regard sur vos photos" onClose={onClose} className="viewer-modal">
      <div className="viewer-toolbar">
        <div
          ref={modeRef}
          className="segmented-control"
          role="group"
          aria-label="Type d’annotation"
        >
          <span className="selection-indicator" aria-hidden="true" />
          <button
            onClick={() => setMode('parts')}
            aria-pressed={mode === 'parts'}
            className={mode === 'parts' ? 'selected' : ''}
          >
            Pièces
          </button>
          <button
            onClick={() => setMode('damages')}
            aria-pressed={mode === 'damages'}
            className={mode === 'damages' ? 'selected' : ''}
          >
            Dommages
          </button>
        </div>
        <span>Déplacez la séparation pour comparer</span>
      </div>
      <PhotoComparison photo={photo} mode={mode} split={split} onSplitChange={setSplit} />
      <div className="viewer-footer">
        <div>
          <strong>{photo.photo_id.replaceAll('_', ' ')}</strong>
          <span>
            Photo {index + 1} sur {photos.length}
          </span>
        </div>
        <div className="viewer-navigation">
          <button
            className="button button-secondary"
            onClick={() => changePhoto(index - 1)}
            disabled={index === 0}
            aria-label="Photo précédente"
          >
            <ChevronLeft size={17} />
            <span>Précédente</span>
          </button>
          <button
            className="button button-secondary"
            onClick={() => changePhoto(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Photo suivante"
          >
            <span>Suivante</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
