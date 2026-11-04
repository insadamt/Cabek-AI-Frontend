/** Category routes, query persistence and saved-evidence admission rules without browser automation. */
import { describe, expect, it } from 'vitest';
import { getPreviewDossiers, getPreviewResult, previewDossiers } from '../preview/data';
import { workflowExamples } from '../preview/workflows';
import {
  canAnalyzeDossier,
  categories,
  categoryPath,
  collectionQuery,
  collectionUrl,
  parseWorkflowRoute,
  phaseSideCount,
  savedPhaseSideCount,
  previewWorkflowStatus,
  validCatalogSelection,
  validCreation,
} from './workflows';
import type { CreateDossierInput } from '../workflowTypes';

const validInput: CreateDossierInput = {
  type: 'chiffrage_rapide',
  marque_id: 1,
  model_id: 10,
  matricule: '0000 · أ · 6',
  date_mise_en_circulation: '2020-02-29',
};
describe('category routes and returning collection state', () => {
  it.each(categories)('resolves the $type category direct link', (category) => {
    expect(parseWorkflowRoute(categoryPath(category.type))).toEqual({ category, creating: false });
  });
  it('permits creation only for quick estimates and verification', () => {
    expect(parseWorkflowRoute('/categories/forfait-expertise/new')).toBeUndefined();
    expect(parseWorkflowRoute('/categories/chiffrage-rapide/new')?.creating).toBe(true);
    expect(parseWorkflowRoute('/categories/verification/new/')?.creating).toBe(true);
    expect(parseWorkflowRoute('/categories/unknown')).toBeUndefined();
  });
  it('keeps filters, grid mode and selected carousel position in search navigation', () => {
    const original = new URLSearchParams(
      'search=Renault&workflow_status=ready_to_scan&slide=14&sort=updated_at_desc&created_from=2026-01-01',
    );
    const path = collectionUrl('/categories/chiffrage-rapide', original, {
      search: 'أ',
      offset: '24',
    });
    const url = new URL(path, 'https://cabek.example');
    expect(url.pathname).toBe('/categories/chiffrage-rapide');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'أ',
      workflow_status: 'ready_to_scan',
      slide: '14',
      sort: 'updated_at_desc',
      created_from: '2026-01-01',
      offset: '24',
    });
    expect(original.get('search')).toBe('Renault');
    expect(collectionUrl(url.pathname, url.searchParams, { search: null, offset: null })).toContain(
      'slide=14',
    );
  });
  it('rejects statuses from other categories and invalid dates/offsets', () => {
    const query = collectionQuery(
      categories[2],
      new URLSearchParams(
        'workflow_status=estimated&created_from=2026-02-30&slide=-1&sort=unknown',
      ),
    );
    expect(query).toMatchObject({
      type: 'verification',
      offset: 0,
      workflow_status: undefined,
      created_from: undefined,
      sort: 'created_at_desc',
    });
  });
});

describe('category-specific server query fixtures', () => {
  it.each(categories)('returns only $type dossiers', (category) => {
    const response = getPreviewDossiers(collectionQuery(category, new URLSearchParams(), 100));
    expect(response.items.length).toBeGreaterThan(0);
    expect(
      response.items.every((item) => (item.type ?? 'forfait_expertise') === category.type),
    ).toBe(true);
  });
  it('applies search, workflow status, date range and pagination together', () => {
    const response = getPreviewDossiers(
      collectionQuery(
        categories[2],
        new URLSearchParams(
          'search=Renault&workflow_status=comparison_ready&created_from=2026-10-28&created_to=2026-10-28',
        ),
        24,
      ),
    );
    expect(response.total).toBe(1);
    expect(response.items[0].dossier_id).toBe('VERIF-APERCU-04');
  });
  it('returns an empty state for unmatched searches', () => {
    expect(
      getPreviewDossiers(collectionQuery(categories[1], new URLSearchParams('search=missing')))
        .items,
    ).toEqual([]);
  });
  it('keeps existing expertise result and finance fixtures', () => {
    const completed = previewDossiers.find((item) => item.status === 'completed')!;
    expect(
      getPreviewResult(completed.dossier_id).result?.financial.estimated_total,
    ).toBeGreaterThan(0);
  });
});

describe('required metadata and catalogue dependency', () => {
  it('accepts valid complete metadata and bilingual registration', () =>
    expect(validCreation(validInput)).toBe(true));
  it.each([
    { matricule: ' ' },
    { marque_id: 0 },
    { model_id: -1 },
    { date_mise_en_circulation: '' },
    { date_mise_en_circulation: '2020' },
    { date_mise_en_circulation: '2023-02-29' },
  ])('rejects incomplete or invalid metadata %j', (change) => {
    expect(validCreation({ ...validInput, ...change })).toBe(false);
  });
  it('rejects a model from a previous brand selection and pending catalogue data', () => {
    const brands = [
      { id: 1, libelle: 'Renault' },
      { id: 2, libelle: 'Dacia' },
    ];
    const models = [{ id: 10, libelle: 'Clio', marque_id: 1 }];
    expect(validCatalogSelection(validInput, brands, models)).toBe(true);
    expect(validCatalogSelection({ ...validInput, marque_id: 2 }, brands, models)).toBe(false);
    expect(validCatalogSelection(validInput, brands, undefined)).toBe(false);
  });
});

describe('photo completeness and AI eligibility', () => {
  it('permits real detection with one saved side before vehicle metadata is complete', () => {
    const response = getPreviewResult('RAPIDE-APERCU-02');
    expect(response.photos).toHaveLength(1);
    expect(canAnalyzeDossier({ ...response, photo_count: 1 })).toBe(true);
    expect(canAnalyzeDossier({ ...response, photo_count: 0 })).toBe(false);
    expect(
      canAnalyzeDossier({
        ...response,
        photo_count: 1,
        vehicle: { ...response.vehicle, date_mise_en_circulation: null },
      }),
    ).toBe(true);
  });
  it.each(['before_incomplete', 'awaiting_after', 'after_incomplete', 'comparison_ready'] as const)(
    'derives %s from distinct saved phase sides',
    (status) => {
      const response = workflowExamples().find((item) => item.workflow_status === status)!;
      expect(previewWorkflowStatus(response)).toBe(status);
      expect(canAnalyzeDossier({ ...response, photo_count: response.photos.length })).toBe(false);
    },
  );
  it('does not count duplicate photos as additional sides', () => {
    const front = {
      photo_id: 'f',
      original_url: '/f.jpg',
      side: 'front' as const,
      phase: 'before' as const,
    };
    expect(phaseSideCount([front, front, front, front], 'before')).toBe(1);
    expect(phaseSideCount([front], 'after')).toBe(0);
  });
  it('uses server missing-side information rather than counting invalid saved originals', () => {
    const response = getPreviewResult('VERIF-APERCU-04');
    response.comparison = {
      slots: [],
      missing_before: ['front'],
      missing_after: [],
      before_locked: true,
      finalized: true,
    };
    expect(savedPhaseSideCount(response, 'before')).toBe(3);
    expect(savedPhaseSideCount(response, 'after')).toBe(4);
  });
});
