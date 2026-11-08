/** Repair evidence shares dossier action styling and photo inspection; depends on saved phases and tunnel capture. */
import { useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, Camera, Columns2, Images, Upload } from 'lucide-react';
import { DossierPhotoWorkspace } from './DossierPhotoWorkspace';
import type { DossierResponse } from '../../types';
import type { PhotoSide } from '../../workflowTypes';
import { savedPhaseSideCount, vehicleSides } from '../../lib/workflows';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { useWorkflowReveal } from '../../hooks/useWorkflowReveal';
import { OriginalPhotoPreview } from './OriginalPhotoPreview';
import { WorkflowPhotoCapture } from './WorkflowPhotoCapture';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { captureReady } from '../../lib/tunnelCapture';
import { describeError } from '../../lib/api';
import { navigate } from '../../hooks/useNavigation';

interface VerificationProps {
  response: DossierResponse;
  onSaved: (response: DossierResponse) => void;
  onRefresh: () => void;
}
export function VerificationWorkspace(props: VerificationProps) {
  const { store, session } = useTunnelCapture('verification');
  const [captureError, setCaptureError] = useState('');
  const ready =
    savedPhaseSideCount(props.response, 'before') === 4 &&
    savedPhaseSideCount(props.response, 'after') === 4;
  const [compare, setCompare] = useState(ready);
  const [showCapture, setShowCapture] = useState(!props.response.photos.length || !ready);
  const selectedTab = ready && compare ? 'comparison' : 'photos';
  const tabs = useSelectionIndicator(selectedTab);

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!ready || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextCompare = event.key === 'End' || (event.key !== 'Home' && !compare);
    setCompare(nextCompare);
    tabs.current
      ?.querySelector<HTMLButtonElement>(
        `#verification-tab-${nextCompare ? 'comparison' : 'photos'}`,
      )
      ?.focus();
  }
  return (
    <div className="workflow-workspace verification-workspace">
      <div className="workflow-view-switch">
        <button
          className="text-link"
          type="button"
          onClick={() => {
            setShowCapture(!showCapture);
            setCompare(false);
          }}
        >
          {showCapture ? (
            <Images size={16} aria-hidden="true" />
          ) : (
            <Upload size={16} aria-hidden="true" />
          )}
          {showCapture ? 'Voir les photos' : 'Collection des photos'}
        </button>
        {savedPhaseSideCount(props.response, 'before') === 4 &&
          !props.response.comparison?.finalized && (
            <div>
              <button
                className="button button-secondary workflow-tunnel-action"
                type="button"
                onClick={() => {
                  try {
                    if (
                      captureReady(session) &&
                      session?.identity.dossierId === props.response.dossier_id
                    )
                      store?.clear();
                    store?.restoreExisting('verification', 'after', props.response.dossier_id);
                    navigate('/?reprendre=1');
                  } catch (error) {
                    setCaptureError(describeError(error));
                  }
                }}
              >
                <Camera size={16} aria-hidden="true" />
                Capture après au tunnel
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
              {captureError && <p role="alert">{captureError}</p>}
            </div>
          )}
      </div>
      <div className="dossier-result-workspace">
        <div
          className="dossier-result-tabs segmented-control"
          role="tablist"
          aria-label="Contenu du dossier"
          ref={tabs}
          onKeyDown={navigateTabs}
        >
          <span className="selection-indicator" aria-hidden="true" />
          {(['photos', 'comparison'] as const).map((value) => (
            <button
              key={value}
              id={`verification-tab-${value}`}
              role="tab"
              aria-selected={selectedTab === value}
              aria-controls={`verification-panel-${value}`}
              tabIndex={selectedTab === value ? 0 : -1}
              className={selectedTab === value ? 'selected' : ''}
              disabled={value === 'comparison' && !ready}
              onClick={() => setCompare(value === 'comparison')}
            >
              {value === 'photos' ? (
                <Images size={16} aria-hidden="true" />
              ) : (
                <Columns2 size={16} aria-hidden="true" />
              )}
              {value === 'photos' ? 'Photos' : 'Comparaison'}
            </button>
          ))}
        </div>
        <div className="dossier-result-panels">
          {/* Retain photo and side selections while switching between the evidence panels. */}
          <div
            role="tabpanel"
            id="verification-panel-photos"
            aria-labelledby="verification-tab-photos"
            hidden={selectedTab !== 'photos'}
            tabIndex={0}
          >
            {showCapture ? (
              <WorkflowPhotoCapture {...props} />
            ) : (
              <DossierPhotoWorkspace
                photos={props.response.photos}
                status="completed"
                loading={false}
                error={null}
                onRetry={props.onRefresh}
              />
            )}
          </div>
          <div
            role="tabpanel"
            id="verification-panel-comparison"
            aria-labelledby="verification-tab-comparison"
            hidden={selectedTab !== 'comparison'}
            tabIndex={0}
          >
            {ready && <RepairComparison response={props.response} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairComparison({ response }: { response: DossierResponse }) {
  const [side, setSide] = useState<PhotoSide>('front');
  const sides = useSelectionIndicator(side);
  const reveal = useWorkflowReveal(side);
  const label = vehicleSides.find(([value]) => value === side)![1];
  return (
    <section
      aria-label="Comparaison avant et après réparation"
      className="surface inspection-workspace repair-comparison"
    >
      <header className="inspection-heading">
        <div>
          <p className="eyebrow">COMPARAISON · 8/8 PHOTOS ENREGISTRÉES</p>
          <h2>La réparation, en regard.</h2>
        </div>
      </header>
      <div className="segmented-control workflow-sides" ref={sides} aria-label="Côté à comparer">
        <span className="selection-indicator" aria-hidden="true" />
        {vehicleSides.map(([value, title]) => (
          <button
            key={value}
            className={side === value ? 'selected' : ''}
            aria-pressed={side === value}
            onClick={() => setSide(value)}
          >
            {title}
          </button>
        ))}
      </div>
      <div className="repair-comparison-pair" ref={reveal}>
        {(['before', 'after'] as const).map((phase) => {
          const photo =
            response.comparison?.slots.find((item) => item.side === side)?.[phase] ??
            response.photos.find((item) => item.side === side && item.phase === phase);
          return (
            <figure key={phase} data-workflow-reveal>
              <figcaption>
                {phase === 'before' ? 'Avant réparation' : 'Après réparation'} · {label}
              </figcaption>
              {photo && <OriginalPhotoPreview key={photo.photo_id} photo={photo} />}
            </figure>
          );
        })}
      </div>
      <p className="workflow-note">Deux prises de vue indépendantes, côte à côte.</p>
    </section>
  );
}
