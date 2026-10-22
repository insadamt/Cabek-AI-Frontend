import { Check, Download, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { RefObject } from 'react';
import { useReportDownloadNotification } from '../../lib/reportDownload';

export function ReportDownloadActivity({
  contentRef,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const notification = useReportDownloadNotification();
  if (!notification) return null;
  const { phase, error } = notification;
  return (
    <div ref={contentRef} className="island-activity report-download-activity">
      <span className="island-pixels" aria-hidden="true">
        {phase === 'downloading' ? (
          <LoaderCircle size={18} className="spin" />
        ) : phase === 'done' ? (
          <Check size={18} />
        ) : (
          <TriangleAlert size={18} />
        )}
      </span>
      <span
        className="island-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        title={error}
      >
        {phase === 'downloading'
          ? 'Téléchargement du PDF…'
          : phase === 'done'
            ? 'Téléchargement lancé'
            : 'PDF indisponible'}
      </span>
      <Download size={15} aria-hidden="true" />
    </div>
  );
}
