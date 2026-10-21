import { describe, expect, it } from 'vitest';
import { getVisibleDossierNumber } from './carousel';

describe('live dossier counter', () => {
  it('updates before release when the next folder becomes nearest to center', () => {
    expect(getVisibleDossierNumber(2, 0.4, 8)).toBe(3);
    expect(getVisibleDossierNumber(2, 0.6, 8)).toBe(4);
    expect(getVisibleDossierNumber(2, -0.6, 8)).toBe(2);
  });

  it('follows long swipes and returns when a drag is canceled', () => {
    expect(getVisibleDossierNumber(2, 2.7, 8)).toBe(6);
    expect(getVisibleDossierNumber(2, 0, 8)).toBe(3);
  });

  it('wraps in both directions and across multiple loops', () => {
    expect(getVisibleDossierNumber(7, 0.6, 8)).toBe(1);
    expect(getVisibleDossierNumber(0, -0.6, 8)).toBe(8);
    expect(getVisibleDossierNumber(0, -16.6, 8)).toBe(8);
  });

  it('uses global positions across page boundaries', () => {
    expect(getVisibleDossierNumber(11, 0.6, 30)).toBe(13);
    expect(getVisibleDossierNumber(12, -0.6, 30)).toBe(12);
  });

  it('keeps the same number when motion commits to the selected folder', () => {
    expect(getVisibleDossierNumber(7, 1, 8)).toBe(getVisibleDossierNumber(0, 0, 8));
  });

  it('handles empty and single-folder collections', () => {
    expect(getVisibleDossierNumber(0, 0, 0)).toBe(0);
    expect(getVisibleDossierNumber(0, 2.6, 1)).toBe(1);
  });
});
