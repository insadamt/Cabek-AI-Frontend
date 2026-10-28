/** Repair evidence workspace with real saved phase counts and side-by-side originals; has no AI dependencies. */
import { useState } from 'react';
import type { DossierResponse } from '../../types';
import type { PhotoSide } from '../../workflowTypes';
import { savedPhaseSideCount, vehicleSides } from '../../lib/workflows';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { useWorkflowReveal } from '../../hooks/useWorkflowReveal';
import { OriginalPhotoPreview } from './OriginalPhotoPreview';
import { WorkflowPhotoCapture } from './WorkflowPhotoCapture';

interface VerificationProps {
  response: DossierResponse;
  onSaved: (response: DossierResponse) => void;
  onRefresh: () => void;
}
export function VerificationWorkspace(props: VerificationProps) {
  const ready =
    savedPhaseSideCount(props.response, 'before') === 4 &&
    savedPhaseSideCount(props.response, 'after') === 4;
  const [compare, setCompare] = useState(ready);
  return (
    <div className="workflow-workspace verification-workspace">
      {ready && (
        <div className="workflow-view-switch">
          <button className="text-link" onClick={() => setCompare(!compare)}>
            {compare ? 'Voir les collections' : 'Comparer avant / après · 8/8'}
          </button>
        </div>
      )}
      {ready && compare ? (
        <RepairComparison response={props.response} />
      ) : (
        <WorkflowPhotoCapture {...props} />
      )}
    </div>
  );
}

function RepairComparison({ response }: { response: DossierResponse }) {
  const [side, setSide] = useState<PhotoSide>('front');
  const sides = useSelectionIndicator(side);
  const reveal = useWorkflowReveal(side);
  const label = vehicleSides.find(([value]) => value === side)![1];
  return (
    <section aria-label="Comparaison avant et après réparation" className="repair-comparison">
      <p className="eyebrow">COMPARAISON · 8/8 PHOTOS ENREGISTRÉES</p>
      <h2>La réparation, en regard.</h2>
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
