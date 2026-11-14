/** Display saved financial totals and labor durations without recalculating prices.
 * Depends on shared API DTOs, formatters, and the accessible details component.
 */
import { ChevronDown, Clock3, Info, TriangleAlert } from 'lucide-react';
import { financialCategories, type FinancialResult } from '../types';
import { displayTotal, financialWarnings, formatLaborHours, formatMoney } from '../lib/format';
import { AnimatedDetails } from './AnimatedDetails';

export function FinancialBreakdown({ financial }: { financial: FinancialResult }) {
  return (
    <div className="financial-breakdown-groups">
      <section className="financial-breakdown-group" aria-label="Main-d’œuvre">
        <h4 className="financial-breakdown-heading">Main-d’œuvre</h4>
        <dl className="financial-breakdown financial-breakdown-labor">
          {financialCategories.map(([category, label]) => {
            if (category === 'paint_materials' || category === 'parts_supply') return null;
            return (
              <div key={category}>
                <dt>{label}</dt>
                <dd>
                  <div className="financial-labor-duration">
                    <span className="financial-metric-label">
                      <Clock3 size={15} aria-hidden="true" />
                      Durée totale
                    </span>
                    <strong
                      className="financial-labor-hours"
                      data-unavailable={financial.labor_hours?.[category] == null || undefined}
                    >
                      {formatLaborHours(financial.labor_hours?.[category])}
                    </strong>
                  </div>
                  <div className="financial-labor-cost">
                    <span className="financial-metric-label">Montant</span>
                    <strong
                      className="financial-line-amount"
                      data-unavailable={financial.breakdown[category] == null || undefined}
                    >
                      {formatMoney(financial.breakdown[category])}
                      {financial.breakdown[category] != null && <small> MAD</small>}
                    </strong>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
      <section className="financial-breakdown-group" aria-label="Pièces et produits">
        <h4 className="financial-breakdown-heading">Pièces et produits</h4>
        <dl className="financial-breakdown financial-breakdown-supplies">
          {financialCategories.map(([category, label]) => {
            if (category !== 'paint_materials' && category !== 'parts_supply') return null;
            return (
              <div key={category}>
                <dt>{label}</dt>
                <dd>
                  {formatMoney(financial.breakdown[category])}
                  {financial.breakdown[category] != null && <span> MAD</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}

export function FinancialSummary({ financial }: { financial: FinancialResult }) {
  const complete = financial.status === 'complete' && financial.estimated_total != null;
  return (
    <section className={`surface financial-summary ${!complete ? 'financial-incomplete' : ''}`}>
      <div className="financial-overline">
        <span>ESTIMATION PROVISOIRE</span>
        <Info size={16} />
      </div>
      <div className={`estimated-total ${!complete ? 'estimated-incomplete' : ''}`}>
        {displayTotal(financial)}
        {complete && <span>MAD</span>}
      </div>
      <p className="financial-description">
        {complete ? (
          'Montant estimé des dommages identifiés.'
        ) : (
          <>
            Sous-total connu : <strong>{formatMoney(financial.known_subtotal)} MAD</strong>
          </>
        )}
      </p>
      {!complete && (
        <div className="financial-warnings">
          <TriangleAlert size={17} />
          <div>
            <strong>Certains montants restent à compléter.</strong>
            <ul>
              {financialWarnings(financial).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <AnimatedDetails
        className="financial-details"
        defaultOpen={!complete}
        summary={
          <>
            Comprendre le chiffrage
            <ChevronDown size={16} />
          </>
        }
      >
        <FinancialBreakdown financial={financial} />
      </AnimatedDetails>
      <div className="provisional-note">
        <span className="tiny-dot" />À vérifier par un expert avant toute décision.
      </div>
    </section>
  );
}
