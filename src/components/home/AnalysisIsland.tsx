/** Coordinates island activity priority and stable responsive sizing; depends on route-aware capture presentation and existing operation stores. */
import gsap from 'gsap';
import { ArrowUpRight, Check, FileText, TriangleAlert } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useHomeAnalysis, type HomeAnalysisSession } from '../../hooks/useHomeAnalysis';
import { navigate, useNavigation } from '../../hooks/useNavigation';
import { getCapturePresentation } from '../../lib/capturePresentation';
import { photoProgress } from '../../lib/format';
import { AttachedIslandSurface } from './AttachedIslandSurface';
import { observeReducedMotion, prefersReducedMotion } from '../../lib/motion';
import { Brand } from '../Brand';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import { useIslandBrandMotion } from '../../hooks/useIslandBrandMotion';
import { DossierOpeningActivity, getDossierOpeningLabel } from './DossierOpeningActivity';
import { useReportDownloadNotification } from '../../lib/reportDownload';
import { ReportDownloadActivity } from './ReportDownloadActivity';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { CaptureIslandActivity } from './CaptureIslandActivity';
import { captureLabel } from '../../lib/tunnelCapture';
import { IslandActivityText } from './IslandActivityText';
import { useIslandErrorTimeout } from '../../hooks/useIslandErrorTimeout';

const activityLabels = {
  queued: 'En attente',
  preparing: 'Préparation',
  analyzing_photos: 'Analyse des photos',
  awaiting_metadata: 'Fiche véhicule à compléter',
  finalizing: 'Création du rapport',
  completed: 'Analyse terminée',
  failed: 'Analyse interrompue',
};

function getActivityLabel(session: HomeAnalysisSession) {
  switch (session.phase) {
    case 'uploading':
      return 'Envoi du dossier';
    case 'extracting':
      return 'Lecture du dossier';
    case 'ingesting':
      return 'Réception du dossier';
    case 'returning':
    case 'stowing':
      return session.error ? 'Retour du dossier' : 'Dossier prêt';
    case 'done':
      return 'Analyse terminée';
    case 'error':
      return 'Analyse indisponible';
    default:
      return session.error
        ? 'Reconnexion'
        : activityLabels[
            session.response?.progress?.stage ??
              (session.response?.status === 'queued' ? 'queued' : 'preparing')
          ];
  }
}

function AnalysisTimer({ session }: { session: HomeAnalysisSession }) {
  const element = useRef<HTMLTimeElement>(null);
  const clock = useRef({ seconds: 0, sampledAt: 0, running: false });
  const progress = session.response?.progress;
  useEffect(() => {
    const active = session.response?.status === 'processing' && session.phase === 'working';
    const now = performance.now();
    const previousElapsed =
      clock.current.seconds + (clock.current.running ? (now - clock.current.sampledAt) / 1000 : 0);
    clock.current = {
      seconds: Math.max(
        previousElapsed,
        (progress?.elapsed_seconds ?? 0) + (active ? (now - session.receivedAt) / 1000 : 0),
      ),
      sampledAt: now,
      running: active,
    };
    function updateTimer() {
      // Interpolate only elapsed time. Photo counts and completion always come from the server.

      const elapsed =
        clock.current.seconds + (active ? (performance.now() - clock.current.sampledAt) / 1000 : 0);
      const minutes = Math.floor(elapsed / 60);
      const remainingSeconds = ((Math.floor(elapsed * 10) % 600) / 10).toFixed(1).padStart(4, '0');
      if (element.current) {
        element.current.textContent = `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
        element.current.dateTime = `PT${elapsed.toFixed(1)}S`;
      }
    }
    updateTimer();
    if (!active) return;
    const timer = window.setInterval(updateTimer, 100);
    return () => window.clearInterval(timer);
  }, [progress, session.receivedAt, session.phase, session.response?.status]);
  return (
    <time ref={element} className="island-timer" aria-label="Temps écoulé">
      00:00.0
    </time>
  );
}

export function AnalysisIsland() {
  const { session: analysisSession, busy } = useHomeAnalysis();
  const { session: capture } = useTunnelCapture();
  const openingSession = useDossierOpening();
  const reportNotification = useReportDownloadNotification();
  const brandRef = useRef<HTMLAnchorElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { location } = useNavigation();
  const capturePresentation = getCapturePresentation(capture, location);
  const captureEligible =
    !!capture && !!capturePresentation && !busy && !openingSession && !reportNotification;
  const errorKey = reportNotification
    ? reportNotification.phase === 'error'
      ? `report:${reportNotification.dossierId}`
      : null
    : openingSession
      ? openingSession.error || openingSession.phase === 'error'
        ? `opening:${openingSession.dossier.dossier_id}`
        : null
      : captureEligible
        ? capture.error ||
          capture.capture?.error_code ||
          capture.capture?.analysis_error ||
          capture.capture?.status === 'failed' ||
          capture.response?.status === 'failed'
          ? `capture:${capture.identity.creationKey}`
          : null
        : analysisSession?.error || analysisSession?.phase === 'error'
          ? `analysis:${analysisSession.dossier.dossier_id}:${analysisSession.startedAt}`
          : null;
  const errorDismissed = useIslandErrorTimeout(errorKey);
  const session = errorDismissed ? null : analysisSession;
  const opening = errorDismissed ? null : openingSession;
  const reportDownload = errorDismissed ? null : reportNotification;
  const showCapture = captureEligible && !errorDismissed;
  const expanded =
    !!reportDownload || !!opening || showCapture || (!!session && session.phase !== 'idle');
  const phase =
    reportDownload?.phase ?? opening?.phase ?? (showCapture ? 'capture' : session?.phase) ?? 'idle';
  const label = reportDownload
    ? reportDownload.phase
    : opening
      ? getDossierOpeningLabel(opening)
      : showCapture
        ? captureLabel(capture)
        : session
          ? getActivityLabel(session)
          : '';
  useIslandBrandMotion(brandRef, expanded);
  const progress = session?.response?.progress;
  const percentage = photoProgress(progress ?? null);
  const success = reportDownload
    ? reportDownload.phase === 'done'
    : opening
      ? !opening.error && ['returning', 'stowing'].includes(opening.phase)
      : showCapture
        ? capturePresentation === 'complete'
        : phase === 'done' || (['returning', 'stowing'].includes(phase) && !session?.error);
  const [detailStep, setDetailStep] = useState(0);
  const [compact, setCompact] = useState(false);
  const hasEstimate = phase === 'working' && progress?.eta_seconds != null && !session?.error;
  const photoDetail = progress
    ? `${progress.photos_completed}/${progress.photos_total} photos`
    : `${session?.dossier.photo_count ?? 0} photos`;
  const etaDetail = hasEstimate ? `≈ ${Math.ceil(progress!.eta_seconds!)} s` : undefined;
  const details = [
    session?.dossier.dossier_id ?? '',
    photoDetail,
    ...(etaDetail ? [etaDetail] : []),
  ];

  // Preserve timer space on phones by sharing the status slot with photo counts and ETA.

  const compactLabels = [label, photoDetail, ...(etaDetail ? [etaDetail] : [])];
  const displayedLabel =
    compact && phase === 'working' && !session?.error
      ? compactLabels[detailStep % compactLabels.length]
      : label;
  const detail = session?.error || details[detailStep % details.length];

  useEffect(() => {
    const media = matchMedia('(max-width: 650px)');
    const updateCompactLayout = () => setCompact(media.matches);
    updateCompactLayout();
    media.addEventListener('change', updateCompactLayout);
    return () => media.removeEventListener('change', updateCompactLayout);
  }, []);

  useEffect(() => {
    setDetailStep(0);
    if (phase !== 'working' || session?.error) return;
    const timer = window.setInterval(() => setDetailStep((previous) => previous + 1), 4000);
    return () => window.clearInterval(timer);
  }, [phase, label, hasEstimate, session?.startedAt, session?.error]);

  useLayoutEffect(() => {
    const island = islandRef.current;
    const content = contentRef.current;
    if (!island || !content) return;
    // Use presentation widths, never a child width constrained by the tween being measured.
    let targetWidth = 300;
    const resizeIsland = () => {
      const styles = getComputedStyle(island);
      const frameGutter = Number.parseFloat(styles.getPropertyValue('--island-frame-gutter')) || 28;
      const activeWidth =
        Number.parseFloat(styles.getPropertyValue('--island-active-width')) || 400;
      const preferredWidth = expanded ? activeWidth : 300;
      targetWidth = Math.min(preferredWidth, window.innerWidth - frameGutter * 2);
      gsap.to(island, {
        width: targetWidth,
        duration: prefersReducedMotion() ? 0 : 0.36,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    };
    resizeIsland();
    const stopObserving = observeReducedMotion(() => {
      gsap.killTweensOf(island);
      island.style.width = `${targetWidth}px`;
    });
    window.addEventListener('resize', resizeIsland);
    return () => {
      stopObserving();
      window.removeEventListener('resize', resizeIsland);
      gsap.killTweensOf(island);
    };
  }, [expanded]);

  return (
    <div
      ref={islandRef}
      className={`ai-activity-island ${expanded ? 'is-expanded' : ''} ${success ? 'is-success' : ''} ${opening ? 'dossier-opening-island' : ''}`}
      data-phase={errorKey && !errorDismissed ? 'error' : phase}
      data-capture-presentation={showCapture ? capturePresentation : undefined}
      data-category={showCapture ? capture.identity.type : undefined}
    >
      <AttachedIslandSurface />
      <div className="island-content-clip">
        <a
          ref={brandRef}
          className="island-brand"
          href="/"
          aria-label="CABEK AI — Accueil"
          tabIndex={expanded ? -1 : 0}
          aria-hidden={expanded}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (!busy) navigate('/');
          }}
        >
          <Brand tone="light" />
        </a>
        {reportDownload ? (
          <ReportDownloadActivity contentRef={contentRef} />
        ) : opening ? (
          <DossierOpeningActivity session={opening} contentRef={contentRef} />
        ) : showCapture ? (
          <CaptureIslandActivity contentRef={contentRef} />
        ) : (
          <div
            ref={contentRef}
            className="island-activity"
            aria-hidden={!expanded}
            inert={!expanded}
          >
            <span className="island-pixels" aria-hidden="true">
              <span className="island-pixel-grid">
                {Array.from({ length: 9 }, (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        '--pixel-index': index,
                        '--pixel-gather-x': `${(1 - (index % 3)) * 3}px`,
                        '--pixel-gather-y': `${(1 - Math.floor(index / 3)) * 3}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </span>
              <Check className="island-success-mark" size={20} />
              <TriangleAlert className="island-error-mark" size={18} />
            </span>
            <span
              className="island-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              title={session?.error || label}
            >
              <IslandActivityText text={displayedLabel} />
            </span>
            <span
              className="island-detail"
              title={
                session?.error ||
                `${session?.dossier.dossier_id ?? ''} · ${photoDetail}${etaDetail ? ` · ${etaDetail}` : ''}`
              }
            >
              <FileText size={11} aria-hidden="true" />
              <IslandActivityText text={detail} />
            </span>
            {session?.response?.progress ? (
              <AnalysisTimer
                key={`${session.dossier.dossier_id}-${session.startedAt}`}
                session={session}
              />
            ) : (
              <span className="island-timer" aria-hidden="true">
                --:--.-
              </span>
            )}
            {session?.error && (
              <a
                className="island-error-link"
                href={`/dossiers/${encodeURIComponent(session.dossier.dossier_id)}`}
                aria-label={`Voir le dossier : ${session.error}`}
                title={session.error}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  navigate(event.currentTarget.getAttribute('href')!);
                }}
              >
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
            {progress && phase === 'working' && (
              <div
                className="island-progress"
                role="progressbar"
                aria-label="Photos analysées"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage ?? undefined}
              >
                <span
                  style={{ width: percentage == null ? '24%' : `${percentage}%` }}
                  className={percentage == null ? 'is-indeterminate' : ''}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
