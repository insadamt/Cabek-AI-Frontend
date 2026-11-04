/** Prepares one destination window before leaving the current page; depends on category queries and abortable dossier reads. */
import type { DossierQuery } from '../types';
import type { Category } from './workflows';
import { homeDossierQuery, loadHomeDossierWindow } from './homeDossiers';

type DossierWindow = Awaited<ReturnType<typeof loadHomeDossierWindow>>;
let prepared: { key: string; data: DossierWindow; expiresAt: number } | undefined;

export async function prepareCollection(category: Category, signal: AbortSignal) {
  const query = homeDossierQuery(category, new URLSearchParams());
  const data = await loadHomeDossierWindow(query, signal);
  signal.throwIfAborted();

  // Keep a bounded, short-lived handoff rather than a general cache that could hide later changes.

  prepared = { key: JSON.stringify(query), data, expiresAt: Date.now() + 30_000 };
}

export function getPreparedCollection(query: DossierQuery) {
  if (prepared && prepared.expiresAt > Date.now() && prepared.key === JSON.stringify(query)) {
    return prepared.data;
  }
}
