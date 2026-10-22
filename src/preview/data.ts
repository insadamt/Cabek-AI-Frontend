import type {
  AnalysisResult,
  DossierList,
  DossierQuery,
  DossierResponse,
  DossierSummary,
  FinancialResult,
  FilterStatus,
  ScanStatus,
} from '../types';
import { ApiError } from '../lib/errors';

const vehicles = [
  ['Renault', 'Clio', 'not_analyzed', 6],
  ['Dacia', 'Sandero', 'completed', 5],
  ['Peugeot', '208', 'processing', 4],
  ['Volkswagen', 'Golf', 'not_analyzed', 8],
  ['Toyota', 'Yaris', 'completed', 6],
  ['Hyundai', 'Tucson', 'queued', 5],
  ['Citroën', 'C3', 'failed', 3],
  ['Dacia', 'Duster', 'completed', 7],
  ['Renault', 'Mégane', 'not_analyzed', 4],
] as const;

export const previewDossiers: DossierSummary[] = vehicles.map(
  ([marque, modele, status, photo_count], index) => ({
    dossier_id: `DOS-20261021-${String(9 - index).padStart(4, '0')}`,
    vehicle: {
      marque,
      modele,
      matricule: `${12000 + index * 137} · A · 6`,
      annee: String(2023 - (index % 4)),
      date_mise_en_circulation: `${2023 - (index % 4)}-06-14`,
      date_sinistre: '2026-10-18',
      marque_id:
        ['Renault', 'Dacia', 'Peugeot', 'Volkswagen', 'Toyota', 'Hyundai', 'Citroën'].indexOf(
          marque,
        ) + 1,
      model_id: (index + 1) * 10,
    },
    created_at: `2026-10-${String(21 - index).padStart(2, '0')}T09:30:00`,
    status,
    photo_count,
  }),
);

const completeFinancial: FinancialResult = {
  status: 'complete',
  currency: 'MAD',
  estimated_total: 4380,
  known_subtotal: 4380,
  breakdown: {
    repair_labor: 660,
    paint_labor: 420,
    paint_materials: 580,
    replacement_labor: 320,
    parts_supply: 2400,
  },
  warnings: [],
};

function previewAnalysis(dossier: DossierSummary): AnalysisResult {
  const incomplete = dossier.vehicle.marque === 'Toyota';
  const empty = dossier.vehicle.modele === 'Duster';
  const financial: FinancialResult = empty
    ? {
        ...completeFinancial,
        estimated_total: 0,
        known_subtotal: 0,
        breakdown: {
          repair_labor: 0,
          paint_labor: 0,
          paint_materials: 0,
          replacement_labor: 0,
          parts_supply: 0,
        },
      }
    : incomplete
      ? {
          ...completeFinancial,
          status: 'incomplete',
          estimated_total: null,
          known_subtotal: 1980,
          breakdown: { ...completeFinancial.breakdown, parts_supply: null },
          warnings: ['Replacement parts_supply unavailable.'],
        }
      : completeFinancial;
  const repair: FinancialResult = {
    ...completeFinancial,
    estimated_total: 1660,
    known_subtotal: 1660,
    breakdown: { ...completeFinancial.breakdown, replacement_labor: 0, parts_supply: 0 },
  };
  const replacement: FinancialResult = {
    ...financial,
    estimated_total: incomplete ? null : 2720,
    known_subtotal: incomplete ? 320 : 2720,
    breakdown: {
      repair_labor: 0,
      paint_labor: 0,
      paint_materials: 0,
      replacement_labor: 320,
      parts_supply: incomplete ? null : 2400,
    },
  };
  return {
    schema_version: 1,
    vehicle: dossier.vehicle,
    financial,
    parts: empty
      ? []
      : [
          {
            part_id: 'bumper',
            name: 'Pare-chocs avant',
            action: 'repair',
            financial: repair,
            detection_ids: ['preview-1'],
            source_images: ['Vue avant'],
          },
          {
            part_id: 'fender',
            name: 'Aile avant gauche',
            action: 'replace',
            financial: replacement,
            detection_ids: ['preview-2'],
            source_images: ['Vue latérale'],
          },
        ],
    detections: empty
      ? []
      : [
          {
            detection_id: 'preview-1',
            type: 'Rayure',
            piece: 'Pare-chocs avant',
            niveau: 'low',
            confiance: 0.94,
            images_sources: ['Vue avant'],
          },
          {
            detection_id: 'preview-2',
            type: 'Déformation',
            piece: 'Aile avant gauche',
            niveau: 'high',
            confiance: 0.91,
            images_sources: ['Vue latérale'],
          },
        ],
    photos: Array.from({ length: dossier.photo_count }, (_, index) => ({
      photo_id:
        ['Vue avant', 'Vue latérale', 'Vue arrière', 'Vue droite'][index] ?? `Détail ${index - 3}`,
      original_url: `/preview/vehicle.svg?view=${index}`,
      parts_url: `/preview/parts.svg?view=${index}`,
      damages_url: `/preview/damages.svg?view=${index}`,
    })),
    report_url: '',
  };
}

export function getPreviewDossiers(query: DossierQuery): DossierList {
  const search = query.search.trim().toLocaleLowerCase('fr');
  const matches = previewDossiers.filter((item) =>
    [item.dossier_id, item.vehicle.marque, item.vehicle.modele, item.vehicle.matricule]
      .join(' ')
      .toLocaleLowerCase('fr')
      .includes(search),
  );
  const counts: Record<FilterStatus, number> = {
    all: matches.length,
    not_analyzed: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  matches.forEach((item) => counts[item.status]++);
  const items = matches.filter((item) => query.status === 'all' || item.status === query.status);
  return {
    items: items.slice(query.offset, query.offset + query.limit),
    total: items.length,
    counts,
    limit: query.limit,
    offset: query.offset,
    warnings: [],
  };
}

export function getPreviewResult(id: string): DossierResponse {
  const dossier = previewDossiers.find((item) => item.dossier_id === id);
  if (!dossier) throw new ApiError('dossier_not_found', 404);
  const status: ScanStatus = dossier.status;
  return {
    dossier_id: id,
    status,
    error:
      status === 'failed'
        ? { code: 'scan_interrupted', message: 'Exemple d’analyse interrompue.' }
        : null,
    progress:
      status === 'processing' || status === 'queued'
        ? {
            stage: status === 'queued' ? 'queued' : 'analyzing_photos',
            annotations_ready: status === 'queued' ? 0 : 6,
            annotations_expected: dossier.photo_count * 3,
            photos_completed: status === 'queued' ? 0 : 2,
            photos_total: dossier.photo_count,
            elapsed_seconds: status === 'queued' ? 0 : 18,
            eta_seconds: null,
            report_ready: false,
            result_ready: false,
          }
        : null,
    result: status === 'completed' ? previewAnalysis(dossier) : null,
  };
}

export function getPreviewBrands() {
  return [
    ...new Map(
      previewDossiers.map((item) => [
        item.vehicle.marque_id!,
        { id: item.vehicle.marque_id!, libelle: item.vehicle.marque },
      ]),
    ).values(),
  ];
}

export function getPreviewModels(brandId: number) {
  return previewDossiers
    .filter((item) => item.vehicle.marque_id === brandId)
    .map((item) => ({
      id: item.vehicle.model_id!,
      marque_id: brandId,
      libelle: item.vehicle.modele,
    }));
}
