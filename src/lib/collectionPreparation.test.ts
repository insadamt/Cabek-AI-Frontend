/** Verifies prepared data matches the destination query and never survives aborted work; depends on isolated paginated reads and a bounded handoff. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const reads = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./homeDossiers', async (original) => ({
  ...(await original<typeof import('./homeDossiers')>()),
  loadHomeDossierWindow: reads.load,
}));
import { getPreparedCollection, prepareCollection } from './collectionPreparation';
import { homeDossierQuery } from './homeDossiers';
import { categories } from './workflows';
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());
describe('prepared collection window', () => {
  it('seeds only the exact category and filter query, then expires', async () => {
    vi.useFakeTimers();
    const data = { items: [], indices: [], total: 0 };
    reads.load.mockResolvedValue(data);
    await prepareCollection(categories[0], new AbortController().signal);
    const query = homeDossierQuery(categories[0], new URLSearchParams());
    expect(getPreparedCollection(query)).toBe(data);
    expect(getPreparedCollection({ ...query, search: 'different' })).toBeUndefined();
    expect(
      getPreparedCollection(homeDossierQuery(categories[1], new URLSearchParams())),
    ).toBeUndefined();
    vi.advanceTimersByTime(30_001);
    expect(getPreparedCollection(query)).toBeUndefined();
  });
  it('does not publish a late response after cancellation', async () => {
    reads.load.mockResolvedValue({ items: [], indices: [], total: 0 });
    const controller = new AbortController();
    controller.abort();
    await expect(prepareCollection(categories[1], controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(
      getPreparedCollection(homeDossierQuery(categories[1], new URLSearchParams())),
    ).toBeUndefined();
  });
});
