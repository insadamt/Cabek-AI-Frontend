/** Displays only confirmed tunnel evidence inside the existing island; depends on the app capture store and media resolver. */
import type { RefObject } from 'react';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { captureLabel } from '../../lib/tunnelCapture';
import { failureMessage, resolveMediaUrl } from '../../lib/api';
import { navigate } from '../../hooks/useNavigation';

export function CaptureIslandActivity({
  contentRef,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const { session } = useTunnelCapture();
  if (!session) return null;
  const { capture, response } = session;
  const photos = capture?.photos.filter((photo) => photo.status === 'saved') ?? [];
  const failureCode = capture?.error_code ?? capture?.analysis_error ?? response?.error?.code;
  return (
    <div ref={contentRef} className="island-activity capture-island-activity">
      <div className="capture-island-copy" role="status" aria-live="polite" aria-atomic="true">
        <strong>{captureLabel(session)}</strong>
        <span>
          {capture
            ? `${capture.saved_count} / ${capture.expected_count} photos enregistrées`
            : 'Dossier persistant'}
          {response?.progress &&
            ` · IA : ${response.progress.stage === 'awaiting_metadata' ? 'fiche requise' : `${response.progress.photos_completed} / ${response.progress.photos_total} photos analysées`}`}
        </span>
        {(session.error || failureCode) && (
          <span className="capture-island-error">
            {session.error || failureMessage(failureCode!)}
          </span>
        )}
      </div>
      <div className="capture-island-photos" aria-label="Dernières photographies enregistrées">
        {photos.slice(-3).map((photo) => (
          <img
            key={photo.photo_id}
            src={resolveMediaUrl(photo.preview_url || photo.original_url)}
            alt={`Photo enregistrée ${photo.side ?? ''}`}
            onError={(event) => {
              const image = event.currentTarget;
              const original = resolveMediaUrl(photo.original_url);
              if (image.getAttribute('src') !== original) image.src = original;
            }}
          />
        ))}
      </div>
      <a
        href="/?reprendre=1"
        className="capture-island-resume"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate('/?reprendre=1');
        }}
      >
        Reprendre
      </a>
    </div>
  );
}
