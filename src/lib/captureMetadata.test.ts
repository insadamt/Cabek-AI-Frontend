/** Moroccan plate boundary checks preserve Arabic letters and backend-compatible Latin input. */
import { describe, expect, it } from 'vitest';
import { validMoroccanPlate } from './captureMetadata';
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
