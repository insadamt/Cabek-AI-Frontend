/** Verify saved labor hours beside costs for global and part financial details.
 * Depends on static React rendering and Vitest; browser automation is not used.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinancialBreakdown } from './FinancialSummary';
import { FinancialDetails } from './dossier/FinancialDetails';
import { PartDetails } from './dossier/PartDetails';
import type { FinancialResult } from '../types';

const financial: FinancialResult = {
  status: 'complete',
  currency: 'MAD',
  estimated_total: 1000,
  known_subtotal: 1000,
  breakdown: {
    repair_labor: 300,
    paint_labor: 200,
    paint_materials: 100,
    replacement_labor: 0,
    parts_supply: 400,
  },
  labor_hours: { repair_labor: 2.75, paint_labor: 1.5, replacement_labor: 0 },
  warnings: [],
};

describe('financial labor hours', () => {
  it('displays each duration in French with its labor label and preserves amounts', () => {
    const markup = renderToStaticMarkup(<FinancialBreakdown financial={financial} />);
    expect(markup).toContain('Tôlerie et réparation');
    expect(markup).toContain('Main-d’œuvre peinture');
    expect(markup).toContain('Main-d’œuvre échange');
    expect(markup).toContain('2,75 h');
    expect(markup).toContain('1,5 h');
    expect(markup).toContain('0 h');
    expect(markup.match(/financial-labor-hours/g)).toHaveLength(3);
    expect(markup).toContain('300,00');
    expect(markup).toContain('MAD');
  });

  it('makes hours available in both global and part drawers', () => {
    const global = renderToStaticMarkup(<FinancialDetails financial={financial} />);
    const part = renderToStaticMarkup(
      <PartDetails
        part={{ name: 'Capot', financial }}
        detections={[]}
        photos={[]}
        onShowPhoto={() => {}}
      />,
    );
    for (const markup of [global, part]) {
      expect(markup).toContain('2,75 h');
      expect(markup).toContain('1,5 h');
      expect(markup).toContain('0 h');
    }
  });

  it('keeps legacy and unknown durations unavailable without marking costs incomplete', () => {
    for (const labor_hours of [
      undefined,
      { repair_labor: null, paint_labor: null, replacement_labor: null },
    ]) {
      const markup = renderToStaticMarkup(
        <FinancialDetails financial={{ ...financial, labor_hours }} />,
      );
      expect(markup.match(/Durée indisponible/g)).toHaveLength(3);
      expect(markup).toContain('Montant estimé');
      expect(markup).not.toContain('Estimation incomplète');
    }
  });

  it('retains known hours even when part supply prices are missing', () => {
    const markup = renderToStaticMarkup(
      <FinancialDetails
        financial={{
          ...financial,
          status: 'incomplete',
          estimated_total: null,
          known_subtotal: 600,
          breakdown: { ...financial.breakdown, parts_supply: null },
          warnings: ['parts_supply unavailable'],
        }}
      />,
    );
    expect(markup).toContain('Estimation incomplète');
    expect(markup).toContain('2,75 h');
    expect(markup).toContain('1,5 h');
    expect(markup).toContain('Indisponible');
  });
});
