import { ChevronsLeftRight, Images, LoaderCircle, RotateCcw } from 'lucide-react';
import { useComparisonImages } from '../hooks/useComparisonImages';
import type { AnnotationMode, ComparisonImagePair } from '../lib/comparisonImages';
import type { Photo } from '../types';

function ComparisonImages({
  pair,
  split,
  previous = false,
}: {
  pair: ComparisonImagePair;
  split: number;
  previous?: boolean;
}) {
  return (
    <div
      className={`comparison-images images-ready ${previous ? 'comparison-previous' : 'comparison-current'}`}
      aria-hidden={previous || undefined}
    >
      <img src={pair.originalUrl} alt={`Photographie originale — ${pair.photoId}`} />
      <div className="annotation-layer" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <img
          src={pair.annotationUrl}
          alt={`Annotation des ${pair.mode === 'parts' ? 'pièces' : 'dommages'} — ${pair.photoId}`}
        />
      </div>
    </div>
  );
}

export function PhotoComparison({
  photo,
  mode,
  split,
  onSplitChange,
}: {
  photo: Photo;
  mode: AnnotationMode;
  split: number;
  onSplitChange: (value: number) => void;
}) {
  const { displayed, previous, ready, error, retryImages } = useComparisonImages(photo, mode);
  return (
    <div className={`comparison ${displayed ? 'has-images' : ''}`} aria-busy={!ready && !error}>
      {previous && <ComparisonImages pair={previous} split={split} previous />}
      {displayed && (
        <ComparisonImages
          key={`${displayed.photoId}-${displayed.mode}-${displayed.annotationUrl}`}
          pair={displayed}
          split={split}
        />
      )}
      {displayed && (
        <>
          <span className="comparison-label comparison-left">
            {displayed.mode === 'parts' ? 'Pièces' : 'Dommages'}
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
            disabled={!ready}
            onChange={(event) => onSplitChange(Number(event.target.value))}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label="Position de la séparation entre annotation et original"
            className="comparison-range"
          />
        </>
      )}
      {!ready && !error && (
        <div className="image-loading" role="status">
          <LoaderCircle size={26} className="spin" />
          <span>Chargement des images…</span>
        </div>
      )}
      {error && (
        <div className="image-loading image-error" role="alert">
          <Images size={30} strokeWidth={1.3} />
          <strong>Cette image est indisponible.</strong>
          <button className="button button-secondary" onClick={retryImages}>
            <RotateCcw size={14} /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
