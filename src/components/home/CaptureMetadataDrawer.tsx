/** Concurrent vehicle editing reuses the dossier drawer and catalogue; PATCH responses remain the source of saved metadata. */
import { useState, type FormEvent } from 'react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { describeError, listBrands, listModels } from '../../lib/api';
import { validDate } from '../../lib/workflows';
import type { CreatableDossierType, PhotoPhase } from '../../workflowTypes';
import type { MetadataPatch } from '../../captureTypes';
import { validMoroccanPlate } from '../../lib/captureMetadata';

interface CaptureMetadataDrawerProps {
  type: CreatableDossierType;
  phase?: PhotoPhase;
  onClose: () => void;
}

export function CaptureMetadataDrawer({ type, phase, onClose }: CaptureMetadataDrawerProps) {
  const { session, store } = useTunnelCapture();
  const [initialVehicle, setInitialVehicle] = useState(session?.response?.vehicle);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !store) return;
    setError('');
    setMessage('');
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
      await store.save(type, phase, patch);
      setInitialVehicle(store.getSnapshot()?.response?.vehicle);
      setMessage('Fiche enregistrée. La capture et l’analyse continuent.');
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
      {() => (
        <form
          className="workflow-vehicle-form capture-metadata-form"
          onSubmit={submit}
          aria-busy={saving}
        >
          <p className="workflow-note">
            Vous pouvez scanner sans ces informations et les compléter pendant la réception des
            photos ou l’analyse.
          </p>
          <div className="workflow-fields">
            <label>
              Marque
              <select
                value={brandId}
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
              {describeError(brands.error ?? models.error)}{' '}
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
          <button className="button workflow-primary" type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}
          </button>
        </form>
      )}
    </DetailsDrawer>
  );
}
