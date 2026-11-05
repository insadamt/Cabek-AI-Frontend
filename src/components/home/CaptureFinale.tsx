/** Reveals a persisted dossier through the Island after the studio exits; depends on journey motion and the shared dossier opening choreography. */
import { useLayoutEffect, useRef, useState } from 'react';
import { DossierFolder } from './DossierFolder';
import { openDossierFromFolder } from '../../lib/dossierNavigation';
import { categoryPath } from '../../lib/workflows';
import { createFolderRelease } from '../../lib/folderFlight';
import { runJourneyMotion } from '../../lib/journeyMotion';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import type { DossierResponse, DossierSummary } from '../../types';

export function CaptureFinale({
  response,
  ready = true,
}: {
  response: DossierResponse;
  ready?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const { store, session } = useTunnelCapture(response.type);
  const opening = useDossierOpening();
  const [released, setReleased] = useState(false);
  const dossier: DossierSummary = {
    dossier_id: response.dossier_id,
    type: response.type,
    source: response.source,
    workflow_status: response.workflow_status,
    vehicle: response.vehicle,
    status: response.status,
    created_at: response.created_at ?? null,
    photo_count: response.photos.length,
  };
  const canOpen =
    ready &&
    (response.type !== 'chiffrage_rapide' ||
      (response.status === 'completed' && !!response.result));
  const latest = useRef({ dossier, canOpen });
  latest.current = { dossier, canOpen };
  const emitted = useRef(false);
  const openingOperation = useRef<AbortController | undefined>(undefined);

  function openWhenReady() {
    if (!emitted.current || !latest.current.canOpen || openingOperation.current) return;
    const controller = new AbortController();
    openingOperation.current = controller;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      const folder = host.current?.querySelector<HTMLElement>('.dossier-folder');
      if (!folder) return;
      void openDossierFromFolder({
        dossier: latest.current.dossier,
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
    });
  }
  useLayoutEffect(() => {
    const container = host.current!;
    const folder = container.querySelector<HTMLElement>('.dossier-folder')!;
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    const target = folder.getBoundingClientRect();
    const origin = island?.getBoundingClientRect() ?? {
      left: target.left,
      width: target.width,
      bottom: target.top,
    };
    const controller = new AbortController();
    const scene = container.parentElement?.querySelector('.category-stage-content');
    const release = createFolderRelease(folder, folder, origin.bottom);
    const releaseScale = Math.min(0.24, (origin.width * 0.4) / target.width);
    const cancelMotion = runJourneyMotion({
      preserveLaunch: true,
      deferRestore: true,
      restore: release.remove,
      build: (timeline) => {
        if (scene) timeline.to(scene, { y: 120, opacity: 0, duration: 0.65, ease: 'power2.in' }, 0);
        // A stationary viewport mask keeps the folder inside the Island until it crosses the lower edge.
        timeline.fromTo(
          release.flight,
          {
            opacity: 1,
            scale: releaseScale,
            x: origin.left + origin.width / 2 - (target.left + target.width / 2),
            y:
              origin.bottom -
              target.top -
              target.height / 2 -
              (target.height * releaseScale) / 2 -
              2,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.95,
            ease: 'power2.inOut',
          },
          0.5,
        );
      },
      onComplete: () =>
        queueMicrotask(() => {
          // Let Strict Mode dispose its rehearsal before starting persisted dossier opening.
          if (controller.signal.aborted) return;
          setReleased(true);
          emitted.current = true;
          openWhenReady();
        }),
    });
    return () => {
      cancelMotion();
      release.remove();
      controller.abort();
      emitted.current = false;
      openingOperation.current?.abort();
      openingOperation.current = undefined;
    };
  }, [response.dossier_id, store, session?.identity.phase]);
  useLayoutEffect(() => {
    openWhenReady();
  }, [canOpen]);
  return (
    <div
      ref={host}
      className="capture-finale"
      data-category={response.type}
      data-waiting={!canOpen}
      data-released={released}
      data-assembled={opening?.phase === 'stowing'}
    >
      <DossierFolder
        dossier={dossier}
        isActive
        interactive={false}
        isOpen={false}
        onSelect={() => {}}
      />
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
