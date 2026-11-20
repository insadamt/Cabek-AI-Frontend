/** Display immutable originals with camera/source attribution; depends on saved photo DTOs and shared media routing. */
import { Images, LoaderCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { OriginalPhoto } from '../../types';
import { resolveMediaUrl } from '../../lib/api';
import { getOriginalPhotoDisplayUrl } from '../../lib/photoDisplayUrls';

export function OriginalPhotoPreview({ photo }: { photo: OriginalPhoto }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function retryPhoto() {
    setLoaded(false);
    setFailed(false);
    setAttempt((previous) => previous + 1);
  }

  return (
    <div className="comparison" aria-busy={!loaded && !failed}>
      <div className={`comparison-images ${loaded ? 'images-ready' : ''}`}>
        {!failed && (
          <img
            key={attempt}
            src={resolveMediaUrl(getOriginalPhotoDisplayUrl(photo))}
            alt={`Photographie originale — ${photo.camera_name ?? photo.photo_id}${photo.capture_source === 'demo' ? ' · Démonstration' : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <span className="comparison-label comparison-right">
        {photo.capture_source === 'demo' ? 'Démonstration' : 'Original'}
        {photo.camera_name ? ` · ${photo.camera_name}` : ''}
      </span>
      {!loaded && !failed && (
        <div className="image-loading" role="status">
          <LoaderCircle size={26} className="spin" />
          <span>Chargement de la photographie…</span>
        </div>
      )}
      {failed && (
        <div className="image-loading image-error" role="alert">
          <Images size={30} strokeWidth={1.3} />
          <strong>Cette image est indisponible.</strong>
          <button className="button button-secondary" onClick={retryPhoto}>
            <RotateCcw size={14} /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
