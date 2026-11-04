/** Moroccan plate boundary checks preserve Arabic letters and backend-compatible Latin input. */
import { describe, expect, it } from 'vitest';
import { completeCaptureVehicle, validMoroccanPlate } from './captureMetadata';
describe('Moroccan registration input', () => {
  it.each(['14554-B-4578', '14554-b-4578', '84654-ب-454', '12345-أ-6', '1-Z-1'])(
    'accepts %s',
    (value) => expect(validMoroccanPlate(value)).toBe(true),
  );
  it.each(['', 'ABC', '1234567-B-1', '12-BB-4', '12-4-4', '12-بب-4', '12-َ-4', '12-ب-', '١٢-ب-3'])(
    'rejects %s',
    (value) => expect(validMoroccanPlate(value)).toBe(false),
  );
});

const fields = { brandId: '12', modelId: '34', plate: '84654-ب-454', date: '2020-05-17' };
const brands = [{ id: 12, libelle: 'Dacia' }];
const models = [{ id: 34, marque_id: 12, libelle: 'Sandero' }];
describe('metadata-first tunnel entry', () => {
  it('accepts a complete sheet only when the model belongs to the selected brand', () => {
    expect(completeCaptureVehicle(fields, brands, models)).toBe(true);
    expect(completeCaptureVehicle(fields, brands, [{ ...models[0], marque_id: 99 }])).toBe(false);
    expect(completeCaptureVehicle(fields, undefined, models)).toBe(false);
    expect(completeCaptureVehicle(fields, brands, undefined)).toBe(false);
  });
  it.each([
    { brandId: '' },
    { modelId: '' },
    { plate: '' },
    { date: '' },
    { date: '2020' },
    { date: '2020-02-30' },
    { plate: 'invalid' },
    { brandId: '99' },
    { modelId: '99' },
  ])('blocks incomplete or invalid entry %j before draft creation', (change) => {
    expect(completeCaptureVehicle({ ...fields, ...change }, brands, models)).toBe(false);
  });
});
