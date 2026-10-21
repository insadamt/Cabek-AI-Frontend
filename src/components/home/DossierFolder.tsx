import gsap from 'gsap';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { vehicleName } from '../../lib/format';
import type { DossierSummary } from '../../types';
import { FolderDocument } from './FolderDocument';

const closedPocketOutline =
  'M.06 .19H.46C.52 .19 .53 .37 .62 .37H.94Q1 .37 .99 .46L.95 .91Q.94 .99 .87 .99H.11Q.035 .99 .03 .91L.005 .29Q0 .19 .06 .19Z';
const openPocketOutline =
  'M.06 .28H.46C.52 .28 .53 .46 .62 .46H.94Q1 .46 .99 .55L.95 .91Q.94 .99 .87 .99H.11Q.035 .99 .03 .91L.005 .38Q0 .28 .06 .28Z';

interface DossierFolderProps {
  dossier: DossierSummary;
  isActive: boolean;
  isOpen: boolean;
  onSelect: () => void;
  onDocumentMotionChange?: (moving: boolean) => void;
}

export function DossierFolder({
  dossier,
  isActive,
  isOpen,
  onSelect,
  onDocumentMotionChange,
}: DossierFolderProps) {
  const analysis = useHomeAnalysis();
  const analysisSession =
    analysis.session?.dossier.dossier_id === dossier.dossier_id ? analysis.session : null;
  const documentOpen = analysisSession
    ? analysisSession.phase === 'uploading'
      ? isOpen
      : !['stowing', 'done', 'error', 'idle'].includes(analysisSession.phase)
    : isOpen;
  const documentAway =
    !!analysisSession && ['ingesting', 'working', 'returning'].includes(analysisSession.phase);
  const folderId = useId().replace(/:/g, '');
  const folderElement = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [documentMoving, setDocumentMoving] = useState(false);
  const mouthOpen =
    analysisSession && analysis.busy
      ? (documentOpen && analysisSession.phase !== 'working') || documentMoving
      : (isActive && hovered) || documentOpen || documentMoving;

  useLayoutEffect(() => {
    if (!isActive) setHovered(false);
  }, [isActive]);

  useLayoutEffect(() => {
    // Morph only the pocket mouth; the bottom contour stays attached to the rear face.

    const outlines = folderElement.current!.querySelectorAll('.folder-front-outline');
    const animation = gsap.to(outlines, {
      attr: { d: mouthOpen ? openPocketOutline : closedPocketOutline },
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.35,
      ease: 'power2.out',
      overwrite: true,
    });
    return () => {
      animation.kill();
    };
  }, [mouthOpen]);
  return (
    <div
      ref={folderElement}
      className={`dossier-folder ${mouthOpen ? 'folder-mouth-open' : ''}`}
      data-dossier-id={dossier.dossier_id}
      data-active={isActive}
      data-document-away={documentAway || undefined}
      data-analysis-active={(!!analysisSession && analysis.busy) || undefined}
      inert={!isActive}
      onPointerEnter={(event) => {
        if (isActive && event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <svg className="folder-shape-definitions" aria-hidden="true">
        <defs>
          <clipPath id={`${folderId}-back`} clipPathUnits="objectBoundingBox">
            <path d="M.09 .01H.9Q.96 .01 .96 .09L.95 .91Q.94 .99 .87 .99H.11Q.035 .99 .03 .91L.025 .1Q.02 .01 .09 .01Z" />
          </clipPath>
          <clipPath id={`${folderId}-shape`} clipPathUnits="objectBoundingBox">
            <path className="folder-front-outline" d={closedPocketOutline} />
          </clipPath>
        </defs>
      </svg>
      <div className="folder-back" style={{ clipPath: `url(#${folderId}-back)` }} />
      {/* The sheet moves within the pocket so both folder faces keep their shared bottom edge. */}
      <FolderDocument
        dossier={{ ...dossier, status: analysis.resolveStatus(dossier) }}
        documentId={`${folderId}-document`}
        isOpen={documentOpen}
        onMotionChange={(moving) => {
          setDocumentMoving(moving);
          onDocumentMotionChange?.(moving);
        }}
      />
      <button
        className="folder-cover"
        type="button"
        style={{ clipPath: `url(#${folderId}-shape)` }}
        aria-label={`Sélectionner ${vehicleName(dossier.vehicle)}, ${dossier.dossier_id}`}
        aria-pressed={isActive}
        aria-disabled={!isActive}
        aria-expanded={documentOpen && !documentAway}
        aria-controls={`${folderId}-document`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => {
          if (isActive && !analysis.busy) {
            analysis.revealDocument(dossier.dossier_id);
            onSelect();
          }
        }}
      >
        <svg
          className="folder-glass-surface"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${folderId}-glass`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
              gradientUnits="objectBoundingBox"
            >
              <stop stopColor="#e2e2e2" stopOpacity=".3" />
              <stop offset=".4" stopColor="#707070" stopOpacity=".28" />
              <stop offset="1" stopColor="#171717" stopOpacity=".86" />
            </linearGradient>
            <linearGradient
              id={`${folderId}-edge`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
              gradientUnits="objectBoundingBox"
            >
              <stop stopColor="#eeeeee" stopOpacity=".65" />
              <stop offset=".55" stopColor="#666" stopOpacity=".3" />
              <stop offset="1" stopColor="#fff" stopOpacity=".25" />
            </linearGradient>
          </defs>
          <path
            className="folder-front-outline"
            d={closedPocketOutline}
            fill={`url(#${folderId}-glass)`}
            stroke={`url(#${folderId}-edge)`}
            strokeWidth="0.005"
          />
        </svg>
        <span className="folder-label">{dossier.dossier_id}</span>
      </button>
    </div>
  );
}
