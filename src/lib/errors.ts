/** French API feedback shared by requests, capture forms and the activity island. */
const errorMessages: Record<string, string> = {
  tunnel_unavailable: 'Le tunnel est indisponible. Activez le mode de capture sur le serveur.',
  tunnel_busy: 'Le tunnel est occupé par un autre véhicule. Réessayez dans un instant.',
  capture_in_progress: 'Une capture est déjà active pour ce dossier.',
  capture_incomplete:
    'Certaines photographies sont manquantes. Reprenez la capture du même dossier.',
  capture_interrupted: 'La capture a été interrompue. Les photos enregistrées sont conservées.',
  mock_photos_unavailable: 'Les photographies du tunnel ne sont pas disponibles sur le serveur.',
  no_sample_photos: 'Aucune photographie n’est disponible dans le tunnel.',
  invalid_sample_side: 'La position d’une photographie du tunnel est invalide.',
  invalid_sample_layout: 'L’organisation des photographies du tunnel est invalide.',
  unsafe_sample_path: 'Une photographie du tunnel est inaccessible.',
  pricing_in_progress: 'Le chiffrage est en cours. La fiche véhicule est maintenant verrouillée.',
  idempotency_conflict:
    'La création ne correspond pas à la session conservée. Reprenez le dossier existant.',
  workflow_contract_unavailable:
    'Ce parcours sera disponible après connexion de l’API des nouveaux dossiers. Vous pouvez le découvrir dans l’aperçu.',
  analysis_not_supported: 'L’analyse IA est indisponible pour les photos avant / après.',
  scan_disabled_for_type: 'L’analyse IA est indisponible pour les photos avant / après.',
  incomplete_vehicle_metadata:
    'Complétez le véhicule et sa date de mise en circulation avant l’analyse.',
  unsupported_sort: 'Le tri par marque n’est pas encore disponible. Choisissez un tri par date.',
  invalid_date_range: 'La date de début doit précéder la date de fin.',
  upload_too_large: 'Chaque photo doit faire au maximum 10 Mio.',
  unsupported_image: 'Choisissez une photographie JPEG ou PNG.',
  invalid_filename: 'Le nom du fichier image est invalide.',
  before_photos_incomplete: 'Enregistrez les quatre photos avant réparation pour continuer.',
  photo_slot_occupied:
    'Une photo est déjà enregistrée pour ce côté et cette phase. Actualisez le dossier.',
  invalid_photo_phase: 'Cette phase ne correspond pas au type de dossier.',
  evidence_finalized: 'Ces photographies sont finalisées et ne peuvent plus être modifiées.',
  externally_owned_dossier: 'Ce dossier d’expertise est géré par son application d’origine.',
  already_analyzed: 'Ce dossier a déjà été analysé. Ouvrez son résultat enregistré.',
  scan_in_progress: 'Une analyse est déjà en cours pour ce dossier.',
  invalid_request: 'Les paramètres de la demande sont invalides.',
  invalid_dossier_id: 'La référence du dossier est invalide.',
  artifact_not_found: 'L’image demandée est indisponible.',
  report_not_found: 'Aucun rapport enregistré n’est disponible pour ce dossier.',
  invalid_image: 'Cette photographie ne peut pas être lue.',
  invalid_report: 'Le rapport enregistré ne peut pas être lu.',
  invalid_analysis: 'Les données d’analyse de ce dossier sont invalides.',
  invalid_status: 'L’état enregistré de l’analyse ne peut pas être lu.',
  invalid_feedback: 'Les observations enregistrées de ce dossier sont invalides.',
  dossier_not_found: 'Ce dossier est introuvable.',
  no_valid_photos: 'Aucune photo valide ne permet de lancer l’analyse.',
  worker_unavailable: 'L’analyse ne peut pas être lancée pour le moment. Réessayez plus tard.',
  storage_unavailable: 'Les dossiers sont momentanément inaccessibles.',
  autoestimate_unavailable: 'Le catalogue des véhicules est indisponible.',
  invalid_vehicle_selection: 'La marque et le modèle sélectionnés ne correspondent pas.',
  invalid_result: 'Le résultat enregistré ou ses images ne peuvent pas être lus.',
  invalid_metadata: 'Les informations de ce dossier sont invalides.',
  scan_timeout: 'Le délai maximal de l’analyse a été dépassé.',
  scan_interrupted: 'L’analyse a été interrompue. Vous pouvez la reprendre depuis le début.',
  scan_inputs_changed: 'Les données du dossier ont changé pendant l’analyse.',
  scan_failed: 'L’analyse n’a pas pu aboutir. Vous pouvez réessayer.',
  preview_only: 'Cet aperçu est en lecture seule. Connectez votre API pour lancer une analyse.',
};

export class ApiError extends Error {
  constructor(
    public code: string,
    public status?: number,
  ) {
    super(errorMessages[code] ?? 'La demande n’a pas abouti. Veuillez réessayer.');
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.';
}

export function failureMessage(code: string): string {
  return errorMessages[code] ?? errorMessages.scan_failed;
}
