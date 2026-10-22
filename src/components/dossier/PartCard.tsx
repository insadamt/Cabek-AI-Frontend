import { ArrowRight, CircleHelp, RefreshCw, Wrench } from 'lucide-react';
import type { Detection, Part } from '../../types';
import { formatMoney } from '../../lib/format';
import { getPartDecision } from '../../lib/partPresentation';
import { DamageBadge } from './DamageBadge';
import { PartIllustration } from './PartIllustration';

interface PartCardProps {
  part: Part;
  detections: Detection[];
  selected: boolean;
  onOpenDetails: () => void;
}

export function PartCard({ part, detections, selected, onOpenDetails }: PartCardProps) {
  const financial = part.financial;
  const complete = financial?.status === 'complete' && financial.estimated_total != null;
  const decision = getPartDecision(part, detections);
  const DecisionIcon =
    decision === 'Réparer' ? Wrench : decision === 'Remplacer' ? RefreshCw : CircleHelp;
  const damageTypes = [...new Set(detections.map((detection) => detection.type))];
  const name = part.name?.replace(/^p[_\s-]+/i, '') || 'Pièce non identifiée';

  return (
    <button
      type="button"
      className="surface estimate-part-card"
      onClick={onOpenDetails}
      aria-haspopup="dialog"
      aria-label={`Voir les détails : ${name}`}
      data-selected={selected}
    >
      <PartIllustration part={part} />
      <span className="estimate-part-identity">
        <strong>{name}</strong>
        <span className="damage-badges">
          {damageTypes.map((type, index) => (
            <DamageBadge key={`${type}-${index}`} type={type} />
          ))}
        </span>
        <span className="estimate-part-footer">
          <span className="estimate-part-decision">
            <DecisionIcon size={13} aria-hidden="true" />
            {decision}
          </span>
          <span className="estimate-part-amount">
            {complete ? (
              <>
                {formatMoney(financial.estimated_total)} <small>MAD</small>
              </>
            ) : (
              'Prix incomplet'
            )}
          </span>
          <ArrowRight size={16} className="part-card-arrow" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
