/** Required vehicle metadata form for local workflows; depends on CABEK's AutoEstimate catalogue adapter. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createDossier, describeError, isPreview, listBrands, listModels } from '../../lib/api';
import { useResource } from '../../hooks/useResource';
import { navigate } from '../../hooks/useNavigation';
import { categoryPath, validCatalogSelection, validCreation } from '../../lib/workflows';
import type { CreatableDossierType, CreateDossierInput } from '../../workflowTypes';

export function DossierCreationForm({ type }: { type: CreatableDossierType }) {
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [registration, setRegistration] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  const brands = useResource('creation-brands', listBrands);
  const models = useResource(`creation-models-${brandId}`, (signal) =>
    brandId ? listModels(Number(brandId), signal) : Promise.resolve([]),
  );
  useEffect(() => () => operation.current?.abort(), []);
  const input: CreateDossierInput = {
    type,
    marque_id: Number(brandId),
    model_id: Number(modelId),
    matricule: registration.trim(),
    date_mise_en_circulation: registrationDate,
  };
  const validSelection = validCatalogSelection(input, brands.data, models.data);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validCreation(input) || !validSelection || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError('');
    try {
      const response = await createDossier(input, controller.signal);
      if (controller.signal.aborted) return;
      // Navigate only after the server accepts complete metadata; no empty dossier is pre-created.

      const returnTo = window.history.state?.returnTo ?? categoryPath(type);
      navigate(
        `/dossiers/${encodeURIComponent(response.dossier_id)}`,
        { returnTo, created: true },
        true,
      );
    } catch (failure) {
      if (!controller.signal.aborted) setError(describeError(failure));
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  return (
    <form className="workflow-vehicle-form" onSubmit={submit} aria-busy={saving}>
      <p className="eyebrow">FICHE VÉHICULE · TOUS LES CHAMPS SONT REQUIS</p>
      <h2>Commençons par le véhicule.</h2>
      <div className="workflow-fields">
        <label>
          Marque
          <select
            required
            value={brandId}
            disabled={saving || brands.loading}
            onChange={(event) => {
              setBrandId(event.target.value);
              setModelId('');
            }}
          >
            <option value="">{brands.loading ? 'Chargement…' : 'Choisir une marque'}</option>
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
            required
            value={modelId}
            disabled={!brandId || saving || models.loading}
            onChange={(event) => setModelId(event.target.value)}
          >
            <option value="">
              {models.loading && brandId ? 'Chargement…' : 'Choisir un modèle'}
            </option>
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
            required
            maxLength={100}
            dir="auto"
            value={registration}
            disabled={saving}
            onChange={(event) => setRegistration(event.target.value)}
            autoComplete="off"
            placeholder="12345 · أ · 6"
          />
        </label>
        <label>
          Date de mise en circulation
          <input
            required
            type="date"
            value={registrationDate}
            disabled={saving}
            onChange={(event) => setRegistrationDate(event.target.value)}
          />
        </label>
      </div>
      {(brands.error || models.error) != null && (
        <div role="alert" className="inline-error">
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
        </div>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {isPreview && (
        <p className="workflow-note">
          Aperçu interactif · Votre exemple reste dans cet onglet. Aucune analyse n’est simulée.
        </p>
      )}
      <div className="workflow-form-footer">
        <button
          type="button"
          className="text-link"
          disabled={saving}
          onClick={() => navigate(window.history.state?.returnTo ?? categoryPath(type))}
        >
          Annuler
        </button>
        <button
          className="button workflow-primary"
          type="submit"
          disabled={saving || !validCreation(input) || !validSelection}
        >
          {saving ? 'Création…' : 'Créer et ajouter les photos'}
        </button>
      </div>
      <p role="status" aria-live="polite">
        {saving ? 'Enregistrement du véhicule…' : ''}
      </p>
    </form>
  );
}
