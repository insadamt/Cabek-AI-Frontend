/**
 * Protects replay policy across internal returns, full-document Back and deliberate refreshes.
 * Depends on isolated stageVisit modules and navigation-timing adapters; needs no browser automation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let visit: typeof import('./stageVisit');
let navigationType: string;

beforeEach(async () => {
  vi.resetModules();
  navigationType = 'navigate';
  vi.stubGlobal('performance', {
    getEntriesByType: () => [{ type: navigationType }],
  });
  visit = await import('./stageVisit');
});
afterEach(() => vi.unstubAllGlobals());

describe('studio return visits', () => {
  it('plays the intro on a fresh load without marking an uncommitted render as visited', () => {
    expect(visit.shouldRestoreStageVisit()).toBe(false);
    expect(visit.shouldRestoreStageVisit()).toBe(false);
  });

  it('restores settled on internal Back or Accueil after the stage has opened', () => {
    visit.rememberStageVisit();
    expect(visit.shouldRestoreStageVisit()).toBe(true);
  });

  it('restores settled on full-document browser history navigation', () => {
    navigationType = 'back_forward';
    expect(visit.shouldRestoreStageVisit()).toBe(true);
  });

  it('plays again after a deliberate refresh starts a new document', async () => {
    visit.rememberStageVisit();
    navigationType = 'reload';
    vi.resetModules();
    const refreshedVisit = await import('./stageVisit');
    expect(refreshedVisit.shouldRestoreStageVisit()).toBe(false);
  });

  it('defaults to a fresh entrance when navigation timing is unavailable', () => {
    vi.stubGlobal('performance', undefined);
    expect(visit.shouldRestoreStageVisit()).toBe(false);
  });
});
