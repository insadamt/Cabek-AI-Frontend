import { describe, expect, it } from 'vitest';
import type { RequiredVehicleMetadata } from '../types';
import {
  isValidMetadataDate,
  validateVehicleCatalogue,
  validateVehicleMetadata,
} from './vehicleMetadata';

const vehicle: RequiredVehicleMetadata = {
  marque: 'Dacia',
  modele: 'Logan',
  marque_id: 12,
  model_id: 145,
  matricule: '00001-A-6',
  date_mise_en_circulation: '2019-06-14',
  date_sinistre: '2026-10-20',
};

describe('required vehicle metadata', () => {
  it('accepts a complete vehicle without a redundant year', () => {
    expect(validateVehicleMetadata(vehicle)).toEqual([]);
  });

  it('reports every missing field for a legacy dossier', () => {
    expect(
      validateVehicleMetadata({ marque: '', modele: ' ', matricule: '' }).map(
        (warning) => warning.field,
      ),
    ).toEqual([
      'marque',
      'modele',
      'matricule',
      'marque_id',
      'model_id',
      'date_mise_en_circulation',
      'date_sinistre',
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid catalogue ID %s',
    (marque_id) => {
      expect(validateVehicleMetadata({ ...vehicle, marque_id })).toEqual([
        expect.objectContaining({ field: 'marque_id', code: 'invalid_catalogue_id' }),
      ]);
    },
  );

  it.each(['2019', '2026-02-29', '2026-04-31', '2026-13-01', '20/10/2026', '2026-10-20T00:00:00Z'])(
    'rejects incomplete or impossible dates: %s',
    (date) => {
      expect(isValidMetadataDate(date)).toBe(false);
      expect(validateVehicleMetadata({ ...vehicle, date_sinistre: date })[0].field).toBe(
        'date_sinistre',
      );
    },
  );

  it('accepts a real leap day', () => expect(isValidMetadataDate('2024-02-29')).toBe(true));
});

describe('vehicle catalogue consistency', () => {
  const brands = [{ id: 12, libelle: 'Dacia' }];
  const models = [{ id: 145, libelle: 'Logan', marque_id: 12 }];

  it('accepts matching catalogue labels and identifiers', () => {
    expect(validateVehicleCatalogue(vehicle, brands, models)).toEqual([]);
  });
  it('rejects a model from a different brand even if its ID exists', () => {
    expect(validateVehicleCatalogue(vehicle, brands, [{ ...models[0], marque_id: 99 }])).toEqual([
      expect.objectContaining({ field: 'model_id', code: 'model_brand_mismatch' }),
    ]);
  });
  it('reports unknown brand and model IDs together', () => {
    expect(validateVehicleCatalogue(vehicle, [], [])).toHaveLength(2);
  });
  it('rejects stale or invented labels for valid identifiers', () => {
    expect(
      validateVehicleCatalogue(
        { ...vehicle, marque: 'Renault', modele: 'Clio' },
        brands,
        models,
      ).map((warning) => warning.field),
    ).toEqual(['marque', 'modele']);
  });
});
