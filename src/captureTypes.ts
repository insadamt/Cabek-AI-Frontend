/** Durable tunnel API DTOs; capture evidence and AI progress are independent backend resources. */
import type { DossierResponse, OriginalPhoto, Vehicle } from './types';
import type { CreatableDossierType, PhotoPhase } from './workflowTypes';

export interface CaptureStatus {
  dossier_id: string;
  phase: PhotoPhase | null;
  capture_id: string | null;
  status: 'not_started' | 'capturing' | 'completed' | 'failed';
  expected_count: number;
  saved_count: number;
  photos: (OriginalPhoto & { status: 'saved' })[];
  error_code: string | null;
  analysis_error: string | null;
}

export type MetadataPatch = Partial<
  Pick<
    Vehicle,
    'marque_id' | 'model_id' | 'matricule' | 'date_mise_en_circulation' | 'annee' | 'date_sinistre'
  >
>;

export interface CaptureIdentity {
  type: CreatableDossierType;
  phase?: PhotoPhase;
  creationKey: string;
  dossierId?: string;
}

export interface CaptureSession {
  identity: CaptureIdentity;
  response?: DossierResponse;
  capture?: CaptureStatus;
  synchronized: boolean;
  pending: boolean;
  error: string;
}
