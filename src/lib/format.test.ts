import { describe, expect, it } from 'vitest';
import { displayTotal, financialWarnings, formatMoney, photoProgress } from './format';
import type { FinancialResult, ScanProgress } from '../types';
import { getPreviewDossiers, getPreviewResult } from '../preview/data';

const financial: FinancialResult = {
  status: 'complete',
  currency: 'MAD',
  estimated_total: 0,
  known_subtotal: 0,
  breakdown: {
    repair_labor: 0,
    paint_labor: 0,
    paint_materials: 0,
    replacement_labor: 0,
    parts_supply: 0,
  },
  warnings: [],
};

describe('financial presentation', () => {
  it('keeps a genuine zero distinct from an unknown amount', () => {
    expect(formatMoney(0)).toContain('0,00');
    expect(formatMoney(null)).toBe('Indisponible');
    expect(displayTotal(financial)).toContain('0,00');
  });

  it('never presents a partial subtotal as the estimated total', () => {
    const incomplete: FinancialResult = {
      ...financial,
      status: 'incomplete',
      estimated_total: null,
      known_subtotal: 500,
      warnings: ['Price unavailable.'],
    };
    expect(displayTotal(incomplete)).toBe('Estimation incomplète');
    expect(displayTotal({ ...incomplete, estimated_total: 500 })).toBe('Estimation incomplète');
  });

  it('deduplicates translated warnings without hiding incomplete pricing', () => {
    const warnings = financialWarnings({
      ...financial,
      status: 'incomplete',
      warnings: [
        'Left: parts_supply unavailable.',
        'Right: parts_supply unavailable.',
        'unknown cause',
      ],
    });
    expect(warnings).toHaveLength(2);
    expect(warnings.join(' ')).not.toContain('parts_supply');
    expect(warnings.join(' ')).toContain('limite de chiffrage');
  });
});

describe('observed progress', () => {
  it('keeps unknown progress indeterminate', () => {
    expect(photoProgress(null)).toBeUndefined();
    expect(photoProgress({ photos_total: 0, photos_completed: 0 } as ScanProgress)).toBeUndefined();
  });

  it('measures completed photos independently of scan completion', () => {
    expect(
      photoProgress({ stage: 'finalizing', photos_total: 5, photos_completed: 5 } as ScanProgress),
    ).toBe(100);
    expect(
      photoProgress({
        stage: 'analyzing_photos',
        photos_total: 5,
        photos_completed: 2,
      } as ScanProgress),
    ).toBe(40);
  });
});

describe('read-only preview contract', () => {
  it('applies search before counters, status and pagination', () => {
    const page = getPreviewDossiers({ search: 'Dacia', status: 'completed', limit: 1, offset: 0 });
    expect(page.counts.all).toBe(2);
    expect(page.counts.completed).toBe(2);
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
    const next = getPreviewDossiers({ search: 'Dacia', status: 'completed', limit: 1, offset: 1 });
    expect(next.items[0].dossier_id).not.toBe(page.items[0].dossier_id);
  });

  it('provides complete, incomplete and zero-total examples with reconciled subtotals', () => {
    const page = getPreviewDossiers({ search: '', status: 'completed', limit: 100, offset: 0 });
    const results = page.items.map((item) => getPreviewResult(item.dossier_id).result!);
    expect(results.some((result) => result.financial.estimated_total === 0)).toBe(true);
    expect(results.some((result) => result.financial.status === 'incomplete')).toBe(true);
    results.forEach((result) => {
      const known = Object.values(result.financial.breakdown).reduce<number>(
        (sum, amount) => sum + (amount ?? 0),
        0,
      );
      expect(result.financial.known_subtotal).toBe(known);
    });
  });
});
