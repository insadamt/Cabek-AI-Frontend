import { ChevronDown, Info, TriangleAlert } from 'lucide-react';
import { financialCategories, type FinancialResult } from '../types';
import { displayTotal, financialWarnings, formatMoney } from '../lib/format';
import { AnimatedDetails } from './AnimatedDetails';

export function FinancialBreakdown({ financial }: { financial: FinancialResult }) {
  return (
    <dl className="financial-breakdown">
      {financialCategories.map(([category, label]) => (
        <div key={category}>
          <dt>{label}</dt>
          <dd>
            {formatMoney(financial.breakdown[category])}
            {financial.breakdown[category] != null && <span> MAD</span>}
          </dd>
        </div>
      ))}
    </dl>
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
