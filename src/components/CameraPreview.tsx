/** Own a single visible camera stream and release it on focus/visibility changes; depends on Cabek media URLs. */
import { useState } from 'react';
import { cameraMediaUrl, type Camera } from '../lib/cameraApi';

export function CameraPreview({ camera, demo }: { camera?: Camera; demo: boolean }) {
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  return (
    <div className="camera-preview">
      <p>
        {demo ? 'Démonstration · photo exemple' : 'Aperçu en direct'} ·{' '}
        {camera?.name ?? 'Choisissez une caméra'}
      </p>
      {camera?.online && !failed ? (
        <img
          key={`${camera.channel}-${retry}`}
          src={cameraMediaUrl(demo ? camera.latest_image_url : camera.stream_url)}
          alt={`${demo ? 'Exemple' : 'Direct'} : ${camera.name}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="camera-preview-empty" role="status">
          {failed ? 'Aperçu interrompu.' : 'Caméra indisponible.'}
        </div>
      )}
      {failed && (
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetry((value) => value + 1);
          }}
        >
          Réessayer l’aperçu
        </button>
      )}
    </div>
  );
}
