/** Quick estimates share compact dossier navigation; depends on capture, the result viewer and island scan lifecycle. */
import { useState } from 'react';
import type { DossierResponse, DossierSummary } from '../../types';
import { canAnalyzeDossier } from '../../lib/workflows';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { QuickAnalysisStatus } from './QuickAnalysisStatus';
import { CaptureMetadataDrawer } from '../home/CaptureMetadataDrawer';
import { WorkflowPhotoCapture } from './WorkflowPhotoCapture';
import { DossierResultWorkspace } from './DossierResultWorkspace';

interface QuickEstimateProps {
  response: DossierResponse;
  dossier: DossierSummary;
  error: unknown;
  onSaved: (response: DossierResponse) => void;
  onRefresh: () => void;
}
export function QuickEstimateWorkspace({
  response,
  dossier,
  error,
  onSaved,
  onRefresh,
}: QuickEstimateProps) {
  const [showCapture, setShowCapture] = useState(
    response.status === 'not_analyzed' && !response.photos.length,
  );
  const analysis = useHomeAnalysis();
  const [uploading, setUploading] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const canLaunch =
    canAnalyzeDossier(dossier) && ['not_analyzed', 'failed'].includes(response.status);
  const canFollow = ['queued', 'processing'].includes(response.status);
  return (
    <div className="workflow-workspace quick-estimate-workspace">
      <header className="workflow-workspace-header">
        <QuickAnalysisStatus response={response} />
        <div className="workflow-view-switch">
          <button
            type="button"
            className="text-link"
            disabled={response.status === 'completed' || response.progress?.stage === 'finalizing'}
            onClick={() => setMetadataOpen(true)}
          >
            Fiche véhicule ↗
          </button>
          <button
            className="text-link"
            disabled={analysis.busy || uploading}
            onClick={() => setShowCapture(!showCapture)}
          >
            {showCapture ? 'Voir les photos et l’estimation' : 'Collection des photos'}
          </button>
          {(canLaunch || canFollow) && (
            <button
              className="button workflow-primary"
              disabled={analysis.busy || uploading}
              onClick={(event) => {
                const folder = event.currentTarget
                  .closest('.dossier-page')
                  ?.querySelector<HTMLElement>('.dossier-overview-folder .dossier-folder');
                if (folder) analysis.beginAnalysis(dossier, folder);
              }}
            >
              {canFollow ? 'Suivre l’analyse' : 'Analyser'}
            </button>
          )}
        </div>
      </header>
      {showCapture ? (
        <div className="workflow-capture-scroll" inert={analysis.busy}>
          <WorkflowPhotoCapture
            response={response}
            onSaved={onSaved}
            onRefresh={onRefresh}
            onBusyChange={setUploading}
          />
        </div>
      ) : (
        <DossierResultWorkspace
          dossierId={dossier.dossier_id}
          response={response}
          status={response.status}
          loading={false}
          error={error}
          onRetry={onRefresh}
        />
      )}
      {metadataOpen && (
        <CaptureMetadataDrawer
          type="chiffrage_rapide"
          dossier={response}
          onSaved={onSaved}
          onClose={() => setMetadataOpen(false)}
        />
      )}
    </div>
  );
}
