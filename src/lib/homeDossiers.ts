/** Loads carousel windows and their neighbours; depends on paginated dossier reads and category query rules. */
import { listDossiers } from './api';
import { collectionQuery, type Category } from './workflows';
import type { DossierQuery } from '../types';

export function homeDossierQuery(category: Category, params: URLSearchParams): DossierQuery {
  const requestedSlide = Number(params.get('slide') ?? 0);
  const slide = Number.isSafeInteger(requestedSlide) && requestedSlide >= 0 ? requestedSlide : 0;
  return {
    ...collectionQuery(category, params),
    search: '',
    offset: Math.floor(slide / 12) * 12,
    limit: 12,
  };
}

export async function loadHomeDossierWindow(query: DossierQuery, signal: AbortSignal) {
  const currentPage = await listDossiers(query, signal);
  const pageSize = query.limit;
  const lastOffset = Math.floor(Math.max(0, currentPage.total - 1) / pageSize) * pageSize;
  const neighborOffsets = [
    ...new Set([
      query.offset === 0 ? lastOffset : query.offset - pageSize,
      query.offset >= lastOffset ? 0 : query.offset + pageSize,
    ]),
  ].filter((offset) => offset !== query.offset);

  // Neighbors are ready before a swipe crosses a page or the collection seam.

  const neighbors = await Promise.all(
    neighborOffsets.map(async (offset) => {
      try {
        return await listDossiers({ ...query, offset }, signal);
      } catch {
        return null;
      }
    }),
  );
  const pages = [currentPage, ...neighbors.filter((page) => page !== null)].sort(
    (left, right) => left.offset - right.offset,
  );
  return {
    ...currentPage,
    items: pages.flatMap((page) => page.items),
    indices: pages.flatMap((page) => page.items.map((_, index) => page.offset + index)),
  };
}
