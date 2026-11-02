/** Workflow DTOs match CABEK Global's workflow_schemas.py; transport lives in lib/api.ts. */
import type { DossierResponse, VehicleSelection } from './types';

export type DossierType = 'forfait_expertise' | 'chiffrage_rapide' | 'verification';
export type CreatableDossierType = Exclude<DossierType, 'forfait_expertise'>;
export type PhotoSide = 'front' | 'rear' | 'left' | 'right';
export type PhotoPhase = 'before' | 'after';
export type WorkflowStatus =
  | import('./types').ScanStatus
  | 'draft'
  | 'capturing'
  | 'capture_failed'
  | 'awaiting_metadata'
  | 'awaiting_photos'
  | 'ready_to_scan'
  | 'analyzing'
  | 'estimated'
  | 'before_incomplete'
  | 'awaiting_after'
  | 'after_incomplete'
  | 'comparison_ready';
export type DossierSort = 'created_at_desc' | 'created_at_asc' | 'updated_at_desc' | 'brand_asc';

export interface CreateDossierInput extends VehicleSelection {
  type: CreatableDossierType;
  matricule: string;
  date_mise_en_circulation: string;
}

export interface UploadDossierPhotosInput {
  dossierId: string;
  side: PhotoSide;
  phase?: PhotoPhase;
  files: File[];
}

// Keep multipart details inside the shared transport so capture only works with dossier DTOs.

export interface WorkflowApiAdapter {
  create: (input: CreateDossierInput, signal?: AbortSignal) => Promise<DossierResponse>;
  upload: (
    input: UploadDossierPhotosInput,
    signal?: AbortSignal,
    onPhotoSaved?: (response: DossierResponse, completed: number) => void,
  ) => Promise<DossierResponse>;
}
