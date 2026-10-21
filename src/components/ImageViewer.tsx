import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  Images,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Photo } from '../types';
import { resolveMediaUrl } from '../lib/api';
import { Modal } from './Modal';

function Comparison({
  photo,
  mode,
  split,
  onSplitChange,
}: {
  photo: Photo;
  mode: 'parts' | 'damages';
  split: number;
  onSplitChange: (value: number) => void;
}) {
  const [originalReady, setOriginalReady] = useState(false);
  const [annotationReady, setAnnotationReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const ready = originalReady && annotationReady && !error;
  const annotation = mode === 'parts' ? photo.parts_url : photo.damages_url;

  function retryImages() {
    setError(false);
    setOriginalReady(false);
    setAnnotationReady(false);
    setRetry((value) => value + 1);
  }
  return (
    <div className="comparison" aria-busy={!ready && !error}>
      <div className={`comparison-images ${ready ? 'images-ready' : ''}`} key={retry}>
        <img
          src={resolveMediaUrl(photo.original_url)}
          alt={`Photographie originale — ${photo.photo_id}`}
          onLoad={() => setOriginalReady(true)}
          onError={() => setError(true)}
        />
        <div className="annotation-layer" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img
            src={resolveMediaUrl(annotation)}
            alt={`Annotation des ${mode === 'parts' ? 'pièces' : 'dommages'} — ${photo.photo_id}`}
            onLoad={() => setAnnotationReady(true)}
            onError={() => setError(true)}
          />
        </div>
      </div>
      {ready && (
        <>
          <span className="comparison-label comparison-left">
            {mode === 'parts' ? 'Pièces' : 'Dommages'}
          </span>
          <span className="comparison-label comparison-right">Original</span>
          <div className="comparison-divider" style={{ left: `${split}%` }}>
            <span>
              <ChevronsLeftRight size={19} />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(event) => onSplitChange(Number(event.target.value))}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label="Position de la séparation entre annotation et original"
            className="comparison-range"
          />
        </>
      )}
      {!ready && !error && (
        <div className="image-loading">
          <LoaderCircle size={26} className="spin" />
          <span>Chargement des images…</span>
        </div>
      )}
      {error && (
        <div className="image-loading">
          <Images size={30} strokeWidth={1.3} />
          <strong>Cette image est indisponible.</strong>
          <button className="button button-secondary" onClick={retryImages}>
            <RotateCcw size={14} />
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

export function ImageViewer({ photos, onClose }: { photos: Photo[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'parts' | 'damages'>('parts');
  const [split, setSplit] = useState(50);
  const photo = photos[index];

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
        <div className="segmented-control" role="group" aria-label="Type d’annotation">
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
      <Comparison
        key={`${index}-${mode}`}
        photo={photo}
        mode={mode}
        split={split}
        onSplitChange={setSplit}
      />
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
