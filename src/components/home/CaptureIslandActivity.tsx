/** Displays confirmed capture/AI status in the same compact row as dossier opening; depends on the capture store and shared island styles. */
import { ArrowUpRight, Check, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { RefObject } from 'react';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { captureLabel, captureReady } from '../../lib/tunnelCapture';
import { failureMessage, resolveMediaUrl } from '../../lib/api';
import { navigate } from '../../hooks/useNavigation';
import { IslandActivityText } from './IslandActivityText';

export function CaptureIslandActivity({
  contentRef,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const { session } = useTunnelCapture();
  if (!session) return null;
  const { capture, response } = session;
  const latestPhoto = capture?.photos.filter((photo) => photo.status === 'saved').at(-1);
  const failureCode = capture?.error_code ?? capture?.analysis_error ?? response?.error?.code;
  const error = session.error || (failureCode ? failureMessage(failureCode) : '');
  const analysis = capture?.status === 'completed' && !!response?.progress;
  const completed = analysis ? response!.progress!.photos_completed : (capture?.saved_count ?? 0);
  const total = analysis ? response!.progress!.photos_total : (capture?.expected_count ?? 0);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : undefined;
  const label = captureLabel(session);
  const evidence = capture
    ? `${capture.saved_count} / ${capture.expected_count} photos enregistrées`
    : 'Dossier persistant';
  const detail = analysis
    ? `${evidence} · IA : ${completed} / ${total} photos analysées`
    : evidence;
  return (
    <div ref={contentRef} className="island-activity capture-island-activity">
      <span className="island-pixels">
        {latestPhoto ? (
          <img
            key={latestPhoto.photo_id}
            className="capture-island-photo"
            src={resolveMediaUrl(latestPhoto.preview_url || latestPhoto.original_url)}
            alt={`Photo enregistrée ${latestPhoto.side ?? ''}`}
            onError={(event) => {
              const image = event.currentTarget;
              const original = resolveMediaUrl(latestPhoto.original_url);
              if (image.getAttribute('src') !== original) image.src = original;
            }}
          />
        ) : error ? (
          <TriangleAlert size={18} aria-hidden="true" />
        ) : captureReady(session) ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <LoaderCircle size={18} className="spin" aria-hidden="true" />
        )}
      </span>
      <span
        className="island-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        title={error || `${label} · ${detail}`}
      >
        <IslandActivityText text={label} />
        <span className="visually-hidden">{error ? ` · ${error}` : ` · ${detail}`}</span>
      </span>
      {!error && (
        <span className="island-timer" aria-label={detail} title={detail}>
          {total > 0 ? `${completed}/${total}` : '…'}
        </span>
      )}
      <a
        href="/?reprendre=1"
        className="island-error-link"
        aria-label={error ? `Reprendre la capture : ${error}` : 'Reprendre la capture'}
        title={error || 'Reprendre'}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate('/?reprendre=1');
        }}
      >
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
      {capture && !error && (
        <div
          className="island-progress"
          role="progressbar"
          aria-label={analysis ? 'Photos analysées par l’IA' : 'Photographies enregistrées'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span
            style={{ width: percentage == null ? '24%' : `${percentage}%` }}
            className={percentage == null ? 'is-indeterminate' : ''}
          />
        </div>
      )}
    </div>
  );
}
