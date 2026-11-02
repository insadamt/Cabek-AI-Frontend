/** Category identity, validation and saved-photo rules shared by routes, collections and capture. */
import type { DossierQuery, DossierResponse, DossierSummary, OriginalPhoto } from '../types';
import type { VehicleOption } from '../types';
import type { CreateDossierInput, DossierType, PhotoPhase, WorkflowStatus } from '../workflowTypes';

export const categories = [
  {
    type: 'forfait_expertise',
    slug: 'forfait-expertise',
    title: 'Forfait / Devis d’expertise',
    description: 'Vos expertises, de la photographie au rapport.',
    number: '01',
    statuses: ['not_analyzed', 'queued', 'processing', 'completed', 'failed'],
  },
  {
    type: 'chiffrage_rapide',
    slug: 'chiffrage-rapide',
    title: 'Chiffrage rapide',
    description: 'Un véhicule. Quelques photos. Une estimation.',
    number: '02',
    statuses: [
      'draft',
      'capturing',
      'capture_failed',
      'awaiting_metadata',
      'awaiting_photos',
      'ready_to_scan',
      'analyzing',
      'estimated',
      'failed',
    ],
  },
  {
    type: 'verification',
    slug: 'verification',
    title: 'Photos avant / après',
    description: 'Le même véhicule, avant et après réparation.',
    number: '03',
    statuses: [
      'draft',
      'capturing',
      'capture_failed',
      'awaiting_metadata',
      'before_incomplete',
      'awaiting_after',
      'after_incomplete',
      'comparison_ready',
    ],
  },
] as const;
export type Category = (typeof categories)[number];
export const vehicleSides = [
  ['front', 'Avant'],
  ['rear', 'Arrière'],
  ['left', 'Gauche'],
  ['right', 'Droite'],
] as const;
export const workflowLabels: Record<WorkflowStatus, string> = {
  not_analyzed: 'Non analysé',
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec',
  draft: 'Brouillon',
  capturing: 'Capture en cours',
  capture_failed: 'Capture interrompue',
  awaiting_metadata: 'Fiche véhicule à compléter',
  awaiting_photos: 'En attente de photos',
  ready_to_scan: 'Prêt à analyser',
  analyzing: 'Analyse en cours',
  estimated: 'Estimation disponible',
  before_incomplete: 'Photos avant incomplètes',
  awaiting_after: 'En attente des photos après',
  after_incomplete: 'Photos après incomplètes',
  comparison_ready: 'Comparaison prête',
};
export function categoryForType(type: DossierType = 'forfait_expertise'): Category {
  return categories.find((category) => category.type === type) ?? categories[0];
}
export function categoryPath(type: DossierType = 'forfait_expertise') {
  return `/categories/${categoryForType(type).slug}`;
}
export function parseWorkflowRoute(pathname: string) {
  const match = /^\/categories\/([^/]+)(\/new)?\/?$/.exec(pathname);
  const category = categories.find((item) => item.slug === match?.[1]);
  if (!category || (match?.[2] && category.type === 'forfait_expertise')) return undefined;
  return { category, creating: !!match?.[2] };
}
export function collectionQuery(
  category: Category,
  params: URLSearchParams,
  limit = 12,
): DossierQuery {
  const status = params.get('workflow_status');
  const sort = params.get('sort');
  const offset = Number(params.get(params.has('search') ? 'offset' : 'slide') ?? 0);
  return {
    type: category.type,
    search: params.get('search') ?? '',
    status: 'all',
    limit,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? Math.floor(offset / limit) * limit : 0,
    workflow_status: category.statuses.some((value) => value === status)
      ? (status as WorkflowStatus)
      : undefined,
    created_from: validDate(params.get('created_from')) ? params.get('created_from')! : undefined,
    created_to: validDate(params.get('created_to')) ? params.get('created_to')! : undefined,
    sort: ['created_at_desc', 'created_at_asc', 'updated_at_desc', 'brand_asc'].includes(sort ?? '')
      ? (sort as DossierQuery['sort'])
      : 'created_at_desc',
  };
}
export function collectionUrl(
  pathname: string,
  current: URLSearchParams,
  changes: Record<string, string | null>,
) {
  const params = new URLSearchParams(current);
  Object.entries(changes).forEach(([key, value]) =>
    value === null ? params.delete(key) : params.set(key, value),
  );
  return `${pathname}${params.size ? `?${params}` : ''}`;
}
export function currentCollectionUrl(changes: Record<string, string | null>) {
  return collectionUrl(
    window.location.pathname,
    new URLSearchParams(window.location.search),
    changes,
  );
}
export function validDate(value: string | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validCreation(input: CreateDossierInput): boolean {
  return (
    ['chiffrage_rapide', 'verification'].includes(input.type) &&
    Number.isSafeInteger(input.marque_id) &&
    input.marque_id > 0 &&
    Number.isSafeInteger(input.model_id) &&
    input.model_id > 0 &&
    input.matricule.trim().length > 0 &&
    input.matricule.trim().length <= 100 &&
    validDate(input.date_mise_en_circulation)
  );
}
export function validCatalogSelection(
  input: CreateDossierInput,
  brands?: VehicleOption[],
  models?: VehicleOption[],
) {
  return (
    !!brands?.some((brand) => brand.id === input.marque_id) &&
    !!models?.some(
      (model) =>
        model.id === input.model_id && (!model.marque_id || model.marque_id === input.marque_id),
    )
  );
}
export function phaseSideCount(photos: OriginalPhoto[], phase: PhotoPhase) {
  return vehicleSides.filter(([side]) =>
    photos.some((photo) => photo.side === side && photo.phase === phase),
  ).length;
}
export function savedPhaseSideCount(response: DossierResponse, phase: PhotoPhase) {
  if (response.comparison)
    return 4 - response.comparison[phase === 'before' ? 'missing_before' : 'missing_after'].length;
  return phaseSideCount(response.photos, phase);
}
export function canAnalyzeDossier(
  dossier: Pick<DossierSummary, 'type' | 'vehicle' | 'photo_count'>,
) {
  if (dossier.type === 'verification') return false;
  if (dossier.type !== 'chiffrage_rapide') return true;
  return (
    dossier.photo_count > 0 &&
    !!dossier.vehicle.marque_id &&
    !!dossier.vehicle.model_id &&
    !!dossier.vehicle.matricule.trim() &&
    validDate(dossier.vehicle.date_mise_en_circulation ?? null)
  );
}
export function previewWorkflowStatus(response: DossierResponse): WorkflowStatus {
  if (response.type === 'verification') {
    const before = phaseSideCount(response.photos, 'before');
    const after = phaseSideCount(response.photos, 'after');
    return before < 4
      ? 'before_incomplete'
      : after === 0
        ? 'awaiting_after'
        : after < 4
          ? 'after_incomplete'
          : 'comparison_ready';
  }
  if (response.status === 'completed') return 'estimated';
  if (response.status === 'failed') return 'failed';
  if (['queued', 'processing'].includes(response.status)) return 'analyzing';
  return response.photos.length ? 'ready_to_scan' : 'awaiting_photos';
}
