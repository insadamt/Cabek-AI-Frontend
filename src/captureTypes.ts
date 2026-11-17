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
  slow_mode?: boolean;
  analysis_error: string | null;
}

export type MetadataPatch = Partial<
  Pick<
    Vehicle,
    'marque_id' | 'model_id' | 'matricule' | 'date_mise_en_circulation' | 'annee' | 'date_sinistre'
  >
>;

export type CaptureIdentity =
  | {
      type: 'forfait_expertise';
      dossierId: string;
      phase?: never;
      creationKey: string;
    }
  | {
      type: CreatableDossierType;
      dossierId?: string;
      phase?: PhotoPhase;
      creationKey: string;
    };

export interface CaptureSession {
  identity: CaptureIdentity;
  response?: DossierResponse;
  capture?: CaptureStatus;
  /** Wall time of a witnessed backend status change, stable across polls and route visits. */
  captureChangedAt?: number;
  analysisCompletedAt?: number;
  synchronized: boolean;
  pending: boolean;
  saving?: boolean;
  receivedAt?: number;
  startedAt?: number;
  error: string;
}
