import { useEffect, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, SlidersHorizontal } from 'lucide-react';
import type { Vehicle, VehicleOption } from '../types';
import { describeError, isPreview, listBrands, listModels, saveVehicle } from '../lib/api';
import { AnimatedText } from './AnimatedText';
import { validateVehicleCatalogue, validateVehicleMetadata } from '../lib/vehicleMetadata';
import { MetadataWarnings } from './MetadataWarnings';

export function VehicleForm({
  dossierId,
  vehicle,
  onSaved,
  onBusyChange,
  onPendingChangesChange,
}: {
  dossierId: string;
  vehicle: Vehicle;
  onSaved: (vehicle: Vehicle) => void;
  onBusyChange: (busy: boolean) => void;
  onPendingChangesChange: (dirty: boolean) => void;
}) {
  const [brandId, setBrandId] = useState(vehicle.marque_id ? String(vehicle.marque_id) : '');
  const [modelId, setModelId] = useState(vehicle.model_id ? String(vehicle.model_id) : '');
  const [brands, setBrands] = useState<VehicleOption[]>([]);
  const [models, setModels] = useState<VehicleOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [registration, setRegistration] = useState(vehicle.matricule || '');
  const [registrationDate, setRegistrationDate] = useState(vehicle.date_mise_en_circulation || '');
  const [lossDate, setLossDate] = useState(vehicle.date_sinistre || '');
  const selectedBrand = brands.find((option) => option.id === Number(brandId));
  const selectedModel = models.find((option) => option.id === Number(modelId));
  const selection = {
    marque: selectedBrand?.libelle ?? '',
    modele: selectedModel?.libelle ?? '',
    marque_id: Number(brandId),
    model_id: Number(modelId),
    matricule: registration.trim(),
    date_mise_en_circulation: registrationDate,
    date_sinistre: lossDate,
  };
  const warnings = [
    ...validateVehicleMetadata(selection),
    ...(!brandsLoading && !modelsLoading && brandId && modelId
      ? validateVehicleCatalogue(selection, brands, models)
      : []),
  ];

  function markChanges() {
    setSaved(false);
    setError('');
    onPendingChangesChange(true);
  }

  useEffect(() => {
    const controller = new AbortController();
    setBrandsLoading(true);
    setError('');
    listBrands(controller.signal)
      .then(setBrands)
      .catch((error) => {
        if (!controller.signal.aborted) setError(describeError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBrandsLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelsLoading(false);
      return;
    }
    const controller = new AbortController();
    setModelsLoading(true);
    listModels(Number(brandId), controller.signal)
      .then(setModels)
      .catch((error) => {
        if (!controller.signal.aborted) setError(describeError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, [brandId, retry]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || warnings.length || brandsLoading || modelsLoading || isPreview) return;
    setSaving(true);
    onBusyChange(true);
    setError('');
    setSaved(false);
    try {
      const resolved = await saveVehicle(dossierId, selection);
      // The saved server response owns the displayed metadata; never fill gaps with unsaved input.

      onSaved(resolved);
      onPendingChangesChange(false);
      setSaved(true);
    } catch (error) {
      setError(describeError(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="surface vehicle-form">
      <div className="panel-heading">
        <span className="panel-icon">
          <SlidersHorizontal size={18} />
        </span>
        <div>
          <h2>Compléter les informations</h2>
          <p>Tous les champs sont obligatoires avant de lancer l’analyse.</p>
        </div>
      </div>
      <form onSubmit={submit} onChange={markChanges}>
        <div className="form-fields">
          <label>
            Marque
            <div className="select-wrapper">
              <select
                aria-label="Marque du véhicule"
                value={brandId}
                required
                disabled={brandsLoading || saving || isPreview}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setModelId('');
                  setModels([]);
                  setSaved(false);
                  setError('');
                  onPendingChangesChange(true);
                }}
              >
                <option value="">
                  {brandsLoading ? 'Chargement des marques…' : 'Sélectionner une marque'}
                </option>
                {brands.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.libelle}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <label>
            Modèle
            <div className="select-wrapper">
              <select
                aria-label="Modèle du véhicule"
                value={modelId}
                required
                disabled={!brandId || modelsLoading || saving || isPreview}
                onChange={(event) => {
                  setModelId(event.target.value);
                  setSaved(false);
                  onPendingChangesChange(true);
                }}
              >
                <option value="">
                  {modelsLoading ? 'Chargement des modèles…' : 'Sélectionner un modèle'}
                </option>
                {models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.libelle}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <label>
            Immatriculation
            <input
              required
              value={registration}
              disabled={saving || isPreview}
              onChange={(event) => setRegistration(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            Date de mise en circulation
            <input
              required
              type="date"
              value={registrationDate}
              disabled={saving || isPreview}
              onChange={(event) => setRegistrationDate(event.target.value)}
            />
          </label>
          <label>
            Date du sinistre
            <input
              required
              type="date"
              value={lossDate}
              disabled={saving || isPreview}
              onChange={(event) => setLossDate(event.target.value)}
            />
          </label>
        </div>
        {!brandsLoading && !modelsLoading && <MetadataWarnings warnings={warnings} />}
        {error && (
          <div className="inline-error" role="alert">
            {error}
            <button
              type="button"
              className="text-link"
              onClick={() => setRetry((value) => value + 1)}
            >
              Recharger le catalogue
            </button>
          </div>
        )}
        <div className="form-footer">
          <span aria-live="polite" className="vehicle-save-feedback">
            <AnimatedText text={saved ? 'saved' : 'pending'}>
              {saved ? (
                <>
                  <Check size={14} />
                  Véhicule enregistré
                </>
              ) : isPreview ? (
                'Sélection non modifiable dans l’aperçu.'
              ) : (
                'Les modifications sont enregistrées uniquement après confirmation.'
              )}
            </AnimatedText>
          </span>
          <button
            className="button button-secondary"
            disabled={!!warnings.length || brandsLoading || modelsLoading || saving || isPreview}
            type="submit"
          >
            <AnimatedText text={saving ? 'Enregistrement…' : 'Enregistrer le véhicule'}>
              {saving && <LoaderCircle size={14} className="spin" />}
              {saving ? 'Enregistrement…' : 'Enregistrer le véhicule'}
            </AnimatedText>
          </button>
        </div>
      </form>
    </section>
  );
}
