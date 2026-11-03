/** Displays independent, server-confirmed capture and AI progress with contextual recovery; depends on the app capture store and media resolver. */
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
  const hasError = !!(session.error || failureCode);
  const analysis = capture?.status === 'completed' && !!response?.progress;
  const completed = analysis ? response!.progress!.photos_completed : (capture?.saved_count ?? 0);
  const total = analysis ? response!.progress!.photos_total : (capture?.expected_count ?? 0);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : undefined;
  return (
    <div ref={contentRef} className="island-activity capture-island-activity">
      <div className="capture-island-copy" role="status" aria-live="polite" aria-atomic="true">
        <strong>{captureLabel(session)}</strong>
        {!hasError && (
          <span>
            {capture
              ? `${capture.saved_count} / ${capture.expected_count} photos enregistrées`
              : 'Dossier persistant'}
          </span>
        )}
        {analysis && !hasError && (
          <span>
            IA :{' '}
            {response!.progress!.stage === 'awaiting_metadata'
              ? 'fiche requise'
              : `${completed} / ${total} photos analysées`}
          </span>
        )}
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
      {capture && !session.error && !failureCode && (
        <div
          className="capture-island-progress"
          role="progressbar"
          aria-label={analysis ? 'Photos analysées par l’IA' : 'Photographies enregistrées'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span style={{ width: percentage == null ? '0%' : `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}
