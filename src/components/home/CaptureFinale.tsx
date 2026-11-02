/** Presents an already persisted dossier, then reuses the existing photo/sheet/opening choreography without a carousel detour. */
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { DossierFolder } from './DossierFolder';
import { openDossierFromFolder } from '../../lib/dossierNavigation';
import { categoryPath } from '../../lib/workflows';
import { observeReducedMotion, prefersReducedMotion } from '../../lib/motion';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import type { DossierResponse, DossierSummary } from '../../types';

export function CaptureFinale({ response }: { response: DossierResponse }) {
  const host = useRef<HTMLDivElement>(null);
  const { store, session } = useTunnelCapture();
  const opening = useDossierOpening();
  const [attempt, setAttempt] = useState(0);
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
  useEffect(() => {
    const container = host.current!;
    const folder = container.querySelector<HTMLElement>('.dossier-folder')!;
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    if (!island) return;
    const origin = island.getBoundingClientRect();
    const target = folder.getBoundingClientRect();
    let cancelled = false;
    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        if (cancelled) return;
        void openDossierFromFolder({
          dossier: latest.current,
          folder,
          path: `/dossiers/${encodeURIComponent(response.dossier_id)}`,
          captured: true,
          capturePhase: session?.identity.phase,
          returnTo: categoryPath(response.type),
        }).then(() => {
          if (window.location.pathname.startsWith('/dossiers/')) store?.clear();
        });
      },
    });
    const scene = container.parentElement?.querySelector('.category-stage-content');
    if (scene) timeline.to(scene, { y: 180, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0);
    timeline
      .to(island, { scale: 1.07, duration: 0.25 }, 0.6)
      .fromTo(
        container,
        { opacity: 0, y: origin.bottom - target.top, scale: 0.15 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'back.out(1.2)' },
        0.75,
      )
      .to(island, { scale: 1, duration: 0.25 }, 0.9);
    const stop = observeReducedMotion(() => timeline.progress(1));
    if (prefersReducedMotion()) timeline.progress(1);
    else timeline.play();
    return () => {
      cancelled = true;
      stop();
      timeline.kill();
      gsap.set(island, { clearProps: 'scale' });
    };
  }, [response.dossier_id, attempt, store, session?.identity.phase]);
  return (
    <div
      ref={host}
      className="capture-finale"
      data-category={response.type}
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
            opening.cancel();
            setAttempt((value) => value + 1);
          }}
        >
          Réessayer l’ouverture
        </button>
      )}
    </div>
  );
}
