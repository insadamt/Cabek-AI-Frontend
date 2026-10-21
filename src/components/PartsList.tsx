import { ArrowUpRight, ChevronDown, CircleCheck, Layers3, Wrench } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { financialWarnings, formatMoney } from '../lib/format';
import { FinancialBreakdown } from './FinancialSummary';

const severityLabels: Record<string, string> = {
  low: 'Légère',
  medium: 'Modérée',
  high: 'Importante',
};

export function PartsList({ result }: { result: AnalysisResult }) {
  return (
    <section className="parts-section">
      <div className="section-title">
        <h2>Pièces et dommages</h2>
        <span className="count-pill">{result.parts.length}</span>
      </div>
      <p className="section-description">Les décisions et les montants issus de votre analyse.</p>
      {!result.parts.length && (
        <div className="surface no-damage">
          <CircleCheck size={30} strokeWidth={1.3} />
          <h3>Aucun dommage détecté</h3>
          <p>
            Aucun dommage n’a été détecté sur les photos analysées. Les photos restent disponibles
            pour votre vérification.
          </p>
        </div>
      )}
      <div className="parts-list">
        {result.parts.map((part, partIndex) => {
          // Saved detection IDs can repeat; filtering retains every corresponding damage row.

          const detections = result.detections.filter(
            (detection) =>
              detection.detection_id && part.detection_ids?.includes(detection.detection_id),
          );
          const unidentified =
            !part.name ||
            !part.action ||
            /non identifiée/i.test(part.name) ||
            detections.some((item) => item.chiffrage_bloque);
          const financial = part.financial;
          const complete = financial?.status === 'complete' && financial.estimated_total != null;
          return (
            <details className="surface part-card" key={`${part.part_id ?? 'part'}-${partIndex}`}>
              <summary>
                <span className="part-icon">
                  <Layers3 size={23} strokeWidth={1.2} />
                </span>
                <span className="part-identity">
                  <strong>{part.name || 'Pièce non identifiée'}</strong>
                  <span>
                    {detections.length} dommage{detections.length > 1 ? 's' : ''} ·{' '}
                    {part.source_images?.length ?? 0} vue(s) source(s)
                  </span>
                </span>
                <span className="part-decision">
                  {unidentified ? (
                    <>
                      <Layers3 size={13} />À vérifier
                    </>
                  ) : part.action === 'replace' ? (
                    <>
                      <ArrowUpRight size={13} />
                      Remplacer
                    </>
                  ) : (
                    <>
                      <Wrench size={13} />
                      Réparer
                    </>
                  )}
                </span>
                <span className="part-amount">
                  {complete ? (
                    <>
                      {formatMoney(financial.estimated_total)} <small>MAD</small>
                    </>
                  ) : (
                    'Prix incomplet'
                  )}
                </span>
                <ChevronDown className="details-chevron" size={17} />
              </summary>
              <div className="part-details">
                {detections.length > 0 && (
                  <div className="damage-table">
                    <div className="damage-table-head">
                      <span>Dommage identifié</span>
                      <span>Gravité</span>
                      <span>Confiance de détection</span>
                    </div>
                    {detections.map((detection, index) => (
                      <div key={`${detection.detection_id}-${index}`}>
                        <strong>{detection.type || 'Dommage non précisé'}</strong>
                        <span>{severityLabels[detection.niveau ?? ''] ?? 'Non précisée'}</span>
                        <span>
                          {typeof detection.confiance === 'number'
                            ? `${Math.round(detection.confiance * 100)} %`
                            : 'Non précisée'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {financial && <FinancialBreakdown financial={financial} />}
                {financial && financial.status === 'incomplete' && (
                  <ul className="part-warnings">
                    {financialWarnings(financial).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
                {!!part.source_images?.length && (
                  <p className="source-images">Vues sources : {part.source_images.join(' · ')}</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
