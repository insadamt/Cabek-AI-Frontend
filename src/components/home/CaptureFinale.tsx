/** Presents an already persisted dossier, then reuses the existing photo/sheet/opening choreography without a carousel detour. */
import { useLayoutEffect, useRef, useState } from 'react';
import { DossierFolder } from './DossierFolder';
import { openDossierFromFolder } from '../../lib/dossierNavigation';
import { categoryPath } from '../../lib/workflows';
import { runJourneyMotion } from '../../lib/journeyMotion';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import type { DossierResponse, DossierSummary } from '../../types';

export function CaptureFinale({ response }: { response: DossierResponse }) {
  const host = useRef<HTMLDivElement>(null);
  const { store, session } = useTunnelCapture();
  const opening = useDossierOpening();
  const [released, setReleased] = useState(false);
  const dossier: DossierSummary = {
    dossier_id: response.dossier_id,
    type: response.type,
    workflow_status: response.workflow_status,
    vehicle: response.vehicle,
    status: response.status,
    created_at: response.created_at ?? null,
    photo_count: response.photos.length,
  };
  const latest = useRef(dossier);
  latest.current = dossier;
  useLayoutEffect(() => {
    const container = host.current!;
    const folder = container.querySelector<HTMLElement>('.dossier-folder')!;
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    if (!island) return;
    const origin = island.getBoundingClientRect();
    const target = folder.getBoundingClientRect();
    const controller = new AbortController();
    const scene = container.parentElement?.querySelector('.category-stage-content');
    const cancelMotion = runJourneyMotion({
      build: (timeline) => {
        if (scene) timeline.to(scene, { y: 120, opacity: 0, duration: 0.65, ease: 'power2.in' }, 0);
        timeline
          .to(island, { scale: 1.035, duration: 0.2 }, 0.5)
          .fromTo(
            container,
            { opacity: 0, y: origin.bottom - target.top - target.height / 2, scale: 0.15 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
            0.65,
          )
          .to(island, { scale: 1, duration: 0.25 }, 0.85);
      },
      onComplete: () =>
        queueMicrotask(() => {
          // Let Strict Mode dispose its rehearsal before starting persisted dossier opening.
          if (controller.signal.aborted) return;
          setReleased(true);
          void openDossierFromFolder({
            dossier: latest.current,
            folder,
            path: `/dossiers/${encodeURIComponent(response.dossier_id)}`,
            captured: true,
            capturePhase: session?.identity.phase,
            returnTo: categoryPath(response.type),
            signal: controller.signal,
          }).then(() => {
            if (window.location.pathname === `/dossiers/${encodeURIComponent(response.dossier_id)}`)
              store?.clear();
          });
        }),
    });
    return () => {
      cancelMotion();
      controller.abort();
    };
  }, [response.dossier_id, store, session?.identity.phase]);
  return (
    <div
      ref={host}
      className="capture-finale"
      data-category={response.type}
      data-released={released}
      data-assembled={opening?.phase === 'stowing'}
    >
      <DossierFolder dossier={dossier} isActive isOpen={false} onSelect={() => {}} />
      <p className="capture-finale-reference">
        <strong>{response.dossier_id}</strong>
        <bdi>{response.vehicle.matricule}</bdi>
      </p>
      {opening?.phase === 'error' && (
        <button
          type="button"
          className="button"
          onClick={() => {
            opening.retry();
          }}
        >
          Réessayer l’ouverture
        </button>
      )}
    </div>
  );
}
