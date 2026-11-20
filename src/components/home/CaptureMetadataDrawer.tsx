/**
 * Edits vehicle identity in a grouped form with a persistent save action before tunnel capture.
 * Depends on DetailsDrawer, the vehicle catalogue and metadata API; saving retains the existing validation and exit lifecycle.
 */
import { useId, useState, type FormEvent } from 'react';
import { CarFront, Check, Save } from 'lucide-react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { describeError, listBrands, listModels, patchMetadata } from '../../lib/api';
import { validDate } from '../../lib/workflows';
import type { CreatableDossierType, PhotoPhase } from '../../workflowTypes';
import type { MetadataPatch } from '../../captureTypes';
import type { DossierResponse } from '../../types';
import { completeCaptureVehicle, validMoroccanPlate } from '../../lib/captureMetadata';
import '../../styles/capture-metadata.css';

interface CaptureMetadataDrawerProps {
  type: CreatableDossierType;
  phase?: PhotoPhase;
  onClose: () => void;
  dossier?: DossierResponse;
  onSaved?: (response: DossierResponse) => void;
  requireComplete?: boolean;
  closeOnSave?: boolean;
}

export function CaptureMetadataDrawer({
  type,
  phase,
  onClose,
  dossier,
  onSaved,
  requireComplete = false,
  closeOnSave = false,
}: CaptureMetadataDrawerProps) {
  const { session, store } = useTunnelCapture(type);
  const [initialVehicle, setInitialVehicle] = useState(
    dossier?.vehicle ?? session?.response?.vehicle,
  );
  const [brandId, setBrandId] = useState(String(initialVehicle?.marque_id ?? ''));
  const [modelId, setModelId] = useState(String(initialVehicle?.model_id ?? ''));
  const [plate, setPlate] = useState(initialVehicle?.matricule ?? '');
  const [date, setDate] = useState(initialVehicle?.date_mise_en_circulation ?? '');
  const [incidentDate, setIncidentDate] = useState(initialVehicle?.date_sinistre ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const brands = useResource('capture-brands', listBrands);
  const models = useResource(`capture-models-${brandId}`, (signal) =>
    brandId ? listModels(Number(brandId), signal) : Promise.resolve([]),
  );

  const fieldId = useId();
  const catalogueUnavailable = brands.loading || models.loading || !!brands.error || !!models.error;
  const complete =
    !catalogueUnavailable &&
    completeCaptureVehicle({ brandId, modelId, plate, date }, brands.data, models.data);

  async function submit(event: FormEvent, requestClose: () => void) {
    event.preventDefault();
    if (saving || (!dossier && !store)) return;
    setError('');
    setMessage('');
    if (requireComplete && !complete) {
      setError(
        'Complétez la fiche et choisissez une marque et un modèle dans le catalogue avant de scanner.',
      );
      return;
    }
    const patch: MetadataPatch = {};
    if (plate.trim() !== (initialVehicle?.matricule ?? '')) {
      if (!validMoroccanPlate(plate.trim())) {
        setError('Matricule attendu : 14554-B-4578 ou 84654-ب-454.');
        return;
      }
      patch.matricule = plate.trim();
    }
    if (date !== (initialVehicle?.date_mise_en_circulation ?? '')) {
      if (!validDate(date)) {
        setError('Saisissez une date de mise en circulation complète.');
        return;
      }
      patch.date_mise_en_circulation = date;
    }
    if (incidentDate !== (initialVehicle?.date_sinistre ?? '')) {
      if (!validDate(incidentDate)) {
        setError('Saisissez une date de sinistre complète.');
        return;
      }
      patch.date_sinistre = incidentDate;
    }
    if (
      brandId !== String(initialVehicle?.marque_id ?? '') ||
      modelId !== String(initialVehicle?.model_id ?? '')
    ) {
      if (
        models.loading ||
        !brands.data?.some((brand) => brand.id === Number(brandId)) ||
        !models.data?.some(
          (model) =>
            model.id === Number(modelId) &&
            (!model.marque_id || model.marque_id === Number(brandId)),
        )
      ) {
        setError('Choisissez une marque et son modèle dans le catalogue.');
        return;
      }
      patch.marque_id = Number(brandId);
      patch.model_id = Number(modelId);
    }
    if (!Object.keys(patch).length) {
      setMessage('Aucune modification à enregistrer.');
      return;
    }
    setSaving(true);
    try {
      if (dossier) {
        const saved = await patchMetadata(dossier.dossier_id, patch);
        setInitialVehicle(saved.vehicle);
        onSaved?.(saved);
        void store?.refresh();
      } else {
        await store!.save(type, phase, patch);
        const saved = store!.getSnapshot()?.response;
        setInitialVehicle(saved?.vehicle);
        if (saved) onSaved?.(saved);
      }
      setMessage(
        requireComplete
          ? 'Fiche enregistrée. Vous pouvez maintenant scanner.'
          : 'Fiche enregistrée. La capture et l’analyse continuent.',
      );
      // Let the drawer release its backdrop and focus through the normal exit transition.

      if (closeOnSave) requestClose();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DetailsDrawer
      title="Fiche véhicule"
      subtitle="Identification du véhicule"
      className="capture-metadata-drawer"
      closeLabel="Fermer la fiche véhicule"
      onClose={onClose}
    >
      {(requestClose) => (
        <form
          className="workflow-vehicle-form capture-metadata-form"
          onSubmit={(event) => submit(event, requestClose)}
          aria-busy={saving}
        >
          <div className="capture-metadata-body">
            <div className="capture-metadata-intro">
              <span className="capture-metadata-icon" aria-hidden="true">
                <CarFront size={24} strokeWidth={1.5} />
              </span>
              <div>
                <strong>Le véhicule à inspecter</strong>
                <p>
                  {requireComplete
                    ? 'Complétez les informations du véhicule pour préparer la capture.'
                    : 'Mettez à jour les informations associées à ce dossier.'}
                </p>
              </div>
            </div>
            {requireComplete && <p className="capture-required-note">* Champs obligatoires</p>}
            <fieldset className="capture-form-section">
              <legend>
                <span aria-hidden="true">01</span> Véhicule
              </legend>
              <div className="workflow-fields">
                <label>
                  <span>Marque {requireComplete && <span aria-hidden="true">*</span>}</span>
                  <select
                    value={brandId}
                    required={requireComplete}
                    disabled={saving || brands.loading}
                    onChange={(event) => {
                      setBrandId(event.target.value);
                      setModelId('');
                    }}
                  >
                    <option value="">
                      {brands.loading ? 'Chargement des marques…' : 'Choisir une marque'}
                    </option>
                    {brands.data?.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Modèle {requireComplete && <span aria-hidden="true">*</span>}</span>
                  <select
                    value={modelId}
                    required={requireComplete}
                    disabled={saving || !brandId || models.loading}
                    onChange={(event) => setModelId(event.target.value)}
                  >
                    <option value="">
                      {!brandId
                        ? 'Choisir d’abord une marque'
                        : models.loading
                          ? 'Chargement des modèles…'
                          : 'Choisir un modèle'}
                    </option>
                    {models.data?.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset className="capture-form-section">
              <legend>
                <span aria-hidden="true">02</span> Immatriculation et dates
              </legend>
              <div className="workflow-fields">
                <label className="capture-field-wide">
                  <span>Matricule {requireComplete && <span aria-hidden="true">*</span>}</span>
                  <input
                    dir="auto"
                    autoComplete="off"
                    value={plate}
                    required={requireComplete}
                    disabled={saving}
                    onChange={(event) => setPlate(event.target.value)}
                    placeholder="14554-B-4578"
                    aria-describedby={`${fieldId}-plate-format`}
                  />
                  <small id={`${fieldId}-plate-format`}>
                    Exemples : <bdi>14554-B-4578</bdi> ou <bdi>84654-ب-454</bdi>
                  </small>
                </label>
                <label>
                  <span>
                    Mise en circulation {requireComplete && <span aria-hidden="true">*</span>}
                  </span>
                  <input
                    type="date"
                    value={date}
                    required={requireComplete}
                    disabled={saving}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
                <label>
                  <span>
                    Date de sinistre <small>Facultative</small>
                  </span>
                  <input
                    type="date"
                    value={incidentDate}
                    disabled={saving}
                    onChange={(event) => setIncidentDate(event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            {(brands.error || models.error) != null && (
              <p role="alert" className="capture-catalogue-error">
                Le catalogue AutoEstimate est indisponible. Réessayez pour sélectionner le véhicule.
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    brands.refresh();
                    models.refresh();
                  }}
                >
                  Recharger le catalogue
                </button>
              </p>
            )}
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="capture-metadata-success">
                <Check size={16} aria-hidden="true" />
                {message}
              </p>
            )}
          </div>
          <footer className="capture-metadata-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => requestClose()}
            >
              Annuler
            </button>
            <button
              className="button workflow-primary"
              type="submit"
              disabled={saving || (requireComplete && !complete)}
            >
              <Save size={16} strokeWidth={1.6} aria-hidden="true" />
              {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}
            </button>
          </footer>
        </form>
      )}
    </DetailsDrawer>
  );
}
