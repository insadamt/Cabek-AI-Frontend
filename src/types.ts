export type ScanStatus = 'not_analyzed' | 'queued' | 'processing' | 'completed' | 'failed';
export type FilterStatus = ScanStatus | 'all';
export type Stage =
  'queued' | 'preparing' | 'analyzing_photos' | 'finalizing' | 'completed' | 'failed';

export interface Vehicle {
  marque: string;
  modele: string;
  matricule: string;
  marque_id?: number | null;
  model_id?: number | null;
  annee?: string | null;
  date_sinistre?: string | null;
}

export interface DossierSummary {
  dossier_id: string;
  vehicle: Vehicle;
  created_at: string | null;
  status: ScanStatus;
  photo_count: number;
}

export interface DossierList {
  items: DossierSummary[];
  total: number;
  counts: Record<FilterStatus, number>;
  limit: number;
  offset: number;
  warnings: { dossier_id: string; code: string; message: string }[];
}

export interface DossierQuery {
  search: string;
  status: FilterStatus;
  limit: number;
  offset: number;
}

export interface ScanProgress {
  stage: Stage;
  annotations_ready: number;
  annotations_expected: number;
  photos_completed: number;
  photos_total: number;
  elapsed_seconds: number;
  eta_seconds: number | null;
  report_ready: boolean;
  result_ready: boolean;
}

export const financialCategories = [
  ['repair_labor', 'Tôlerie et réparation'],
  ['paint_labor', 'Main-d’œuvre peinture'],
  ['paint_materials', 'Produits peinture'],
  ['replacement_labor', 'Main-d’œuvre échange'],
  ['parts_supply', 'Fourniture des pièces'],
] as const;

export type FinancialCategory = (typeof financialCategories)[number][0];

export interface FinancialResult {
  status: 'complete' | 'incomplete';
  currency: 'MAD';
  estimated_total: number | null;
  known_subtotal: number;
  breakdown: Record<FinancialCategory, number | null>;
  warnings: string[];
}

export interface Part {
  part_id?: string;
  name?: string | null;
  action?: 'repair' | 'replace';
  financial?: FinancialResult;
  detection_ids?: string[];
  source_images?: string[];
}

export interface Detection {
  detection_id?: string;
  type?: string;
  piece?: string;
  niveau?: string;
  confiance?: number;
  images_sources?: string[];
  chiffrage_bloque?: boolean;
  [key: string]: unknown;
}

export interface Photo {
  photo_id: string;
  original_url: string;
  parts_url: string;
  damages_url: string;
  critical_url?: string;
  original_preview_url?: string;
  parts_preview_url?: string;
  damages_preview_url?: string;
  critical_preview_url?: string;
}

export interface AnalysisResult {
  schema_version: number;
  vehicle: Vehicle;
  financial: FinancialResult;
  parts: Part[];
  detections: Detection[];
  photos: Photo[];
  report_url: string;
}

export interface DossierResponse {
  dossier_id: string;
  status: ScanStatus;
  progress: ScanProgress | null;
  error: { code: string; message: string } | null;
  result: AnalysisResult | null;
}

export interface VehicleOption {
  id: number;
  libelle: string;
  marque_id?: number;
}

export interface VehicleSelection {
  marque_id: number;
  model_id: number;
}
