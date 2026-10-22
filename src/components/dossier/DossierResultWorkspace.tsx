import { Calculator, Images } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { DossierResponse, ScanStatus } from '../../types';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { animateElement } from '../../lib/motion';
import { DossierPhotoWorkspace, type PhotoEvidenceSelection } from './DossierPhotoWorkspace';
import { DossierEstimateWorkspace } from './DossierEstimateWorkspace';

type ResultTab = 'photos' | 'estimate';
interface ResultWorkspaceProps {
  dossierId: string;
  response?: DossierResponse;
  status: ScanStatus;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function DossierResultWorkspace({
  dossierId,
  response,
  status,
  loading,
  error,
  onRetry,
}: ResultWorkspaceProps) {
  const [tab, setTab] = useState<ResultTab>('photos');
  const [evidence, setEvidence] = useState<PhotoEvidenceSelection>();
  const sequence = useRef(0);
  const tabList = useSelectionIndicator(tab);
  const panels = useRef<HTMLDivElement>(null);
  const result = status === 'completed' ? (response?.result ?? null) : null;

  useLayoutEffect(() => {
    const panel = panels.current?.querySelector<HTMLElement>(`#dossier-panel-${tab}`);
    if (!panel) return;
    const animation = animateElement(panel, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    return () => animation?.cancel();
  }, [tab]);

  function showPhotoEvidence(photoIndex: number) {
    setEvidence({ photoIndex, requestId: ++sequence.current });
    setTab('photos');
    // The source button becomes hidden; move focus to the newly visible tab instead of losing it.

    tabList.current?.querySelector<HTMLButtonElement>('#dossier-tab-photos')?.focus();
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 'photos'
        : event.key === 'End'
          ? 'estimate'
          : tab === 'photos'
            ? 'estimate'
            : 'photos';
    setTab(next);
    tabList.current?.querySelector<HTMLButtonElement>(`#dossier-tab-${next}`)?.focus();
  }

  return (
    <div className="dossier-result-workspace">
      <div
        className="dossier-result-tabs segmented-control"
        role="tablist"
        aria-label="Contenu du dossier"
        ref={tabList}
        onKeyDown={navigateTabs}
      >
        <span className="selection-indicator" aria-hidden="true" />
        {(['photos', 'estimate'] as const).map((value) => (
          <button
            key={value}
            id={`dossier-tab-${value}`}
            role="tab"
            aria-selected={tab === value}
            aria-controls={`dossier-panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            className={tab === value ? 'selected' : ''}
            onClick={() => setTab(value)}
          >
            {value === 'photos' ? (
              <Images size={16} aria-hidden="true" />
            ) : (
              <Calculator size={16} aria-hidden="true" />
            )}
            {value === 'photos' ? 'Photos' : 'Estimation'}
          </button>
        ))}
      </div>
      <div className="dossier-result-panels" ref={panels}>
        {/* Keep both panels mounted so tab changes preserve comparisons, disclosures and scroll offsets. */}
        <div
          role="tabpanel"
          id="dossier-panel-photos"
          aria-labelledby="dossier-tab-photos"
          hidden={tab !== 'photos'}
          tabIndex={0}
        >
          <DossierPhotoWorkspace
            photos={result?.photos ?? response?.photos ?? []}
            status={status}
            loading={loading}
            error={error}
            onRetry={onRetry}
            evidenceSelection={evidence}
          />
        </div>
        <div
          role="tabpanel"
          id="dossier-panel-estimate"
          aria-labelledby="dossier-tab-estimate"
          hidden={tab !== 'estimate'}
          tabIndex={0}
        >
          <DossierEstimateWorkspace
            dossierId={dossierId}
            result={result}
            status={status}
            loading={loading}
            error={error}
            onRetry={onRetry}
            onShowPhoto={showPhotoEvidence}
          />
        </div>
      </div>
    </div>
  );
}
