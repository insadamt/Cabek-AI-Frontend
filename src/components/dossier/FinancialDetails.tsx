/** Present saved estimates with a prominent total and readable, grouped line items.
 * Depends on shared financial formatting and breakdown components; incomplete prices stay explicit.
 */
import { TriangleAlert } from 'lucide-react';
import type { FinancialResult } from '../../types';
import { displayTotal, financialWarnings, formatMoney } from '../../lib/format';
import { FinancialBreakdown } from '../FinancialSummary';

export function FinancialDetails({ financial }: { financial: FinancialResult }) {
  const complete = financial.status === 'complete' && financial.estimated_total != null;
  return (
    <div className="drawer-financial-details">
      <div className={`drawer-financial-total${complete ? '' : ' is-incomplete'}`}>
        <span>{complete ? 'Montant estimé' : 'Estimation incomplète'}</span>
        <strong>
          {complete ? displayTotal(financial) : formatMoney(financial.known_subtotal)}{' '}
          <small>MAD</small>
        </strong>
        {!complete && <p>Sous-total connu · Prix incomplet</p>}
      </div>
      <FinancialBreakdown financial={financial} />
      {!complete && (
        <div className="estimate-missing-prices">
          <strong>
            <TriangleAlert size={15} aria-hidden="true" />
            Certains montants restent à compléter.
          </strong>
          <ul>
            {financialWarnings(financial).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="drawer-provisional-note">À vérifier par un expert avant toute décision.</p>
    </div>
  );
}
