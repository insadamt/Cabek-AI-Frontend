/** Requires a complete saved vehicle sheet before tunnel capture; depends on the shared drawer, catalogue and metadata API. */
import { useState, type FormEvent } from 'react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { describeError, listBrands, listModels, patchMetadata } from '../../lib/api';
import { validDate } from '../../lib/workflows';
import type { CreatableDossierType, PhotoPhase } from '../../workflowTypes';
import type { MetadataPatch } from '../../captureTypes';
import type { DossierResponse } from '../../types';
import { completeCaptureVehicle, validMoroccanPlate } from '../../lib/captureMetadata';

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
      subtitle="Informations enregistrées dans le dossier"
      onClose={onClose}
    >
      {(requestClose) => (
        <form
          className="workflow-vehicle-form capture-metadata-form"
          onSubmit={(event) => submit(event, requestClose)}
          aria-busy={saving}
        >
          <p className="workflow-note">
            {requireComplete
              ? 'Renseignez la marque, le modèle, le matricule et la date de mise en circulation. Enregistrez la fiche pour accéder au bouton SCANNER.'
              : 'Complétez la fiche véhicule pour permettre le chiffrage. Les photographies restent consultables pendant la saisie.'}
          </p>
          <div className="workflow-fields">
            <label>
              Marque
              <select
                value={brandId}
                required={requireComplete}
                disabled={saving || brands.loading}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setModelId('');
                }}
              >
                <option value="">Choisir une marque</option>
                {brands.data?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modèle
              <select
                value={modelId}
                required={requireComplete}
                disabled={saving || !brandId || models.loading}
                onChange={(event) => setModelId(event.target.value)}
              >
                <option value="">Choisir un modèle</option>
                {models.data?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Matricule
              <input
                dir="auto"
                autoComplete="off"
                value={plate}
                required={requireComplete}
                disabled={saving}
                onChange={(event) => setPlate(event.target.value)}
                placeholder="84654-ب-454"
              />
            </label>
            <label>
              Date de mise en circulation
              <input
                type="date"
                value={date}
                required={requireComplete}
                disabled={saving}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              Date de sinistre (facultative)
              <input
                type="date"
                value={incidentDate}
                disabled={saving}
                onChange={(event) => setIncidentDate(event.target.value)}
              />
            </label>
          </div>
          {(brands.error || models.error) != null && (
            <p role="alert">
              Le catalogue AutoEstimate est indisponible. Réessayez pour sélectionner le véhicule
              avant de scanner.{' '}
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
          <p role="status">{message}</p>
          <button
            className="button workflow-primary"
            type="submit"
            disabled={saving || (requireComplete && !complete)}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}
          </button>
        </form>
      )}
    </DetailsDrawer>
  );
}
