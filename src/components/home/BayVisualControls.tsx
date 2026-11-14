/**
 * Provides keyboard-accessible Blender model visibility and inspection brightness.
 * Depends on the shared settings DTO; changes only scene presentation and sends no scan command.
 */
import { SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';
import type { BayVisualSettings } from '../scanner/bayControls';

interface BayVisualControlsProps {
  settings: BayVisualSettings;
  disabled: boolean;
  onChange: (settings: BayVisualSettings) => void;
}

export function BayVisualControls({ settings, disabled, onChange }: BayVisualControlsProps) {
  const illuminationId = useId();
  return (
    <details className="bay-visual-controls">
      <summary>
        <SlidersHorizontal size={14} strokeWidth={1.7} aria-hidden="true" />
        <span>Réglages du tunnel</span>
        <span className="bay-visual-chevron" aria-hidden="true">
          +
        </span>
      </summary>
      <fieldset disabled={disabled}>
        <legend className="visually-hidden">Présentation de la scène 3D</legend>
        <div className="bay-visual-illumination">
          <label htmlFor={illuminationId}>Éclairage d’inspection</label>
          <output htmlFor={illuminationId}>{Math.round(settings.illumination * 100)} %</output>
          <input
            id={illuminationId}
            type="range"
            min="15"
            max="100"
            step="5"
            value={Math.round(settings.illumination * 100)}
            aria-valuetext={`${Math.round(settings.illumination * 100)} pour cent`}
            onChange={(event) =>
              onChange({ ...settings, illumination: Number(event.target.value) / 100 })
            }
          />
        </div>
        <label className="bay-visual-switch">
          <span>RGB au repos · simulation</span>
          <input
            type="color"
            value={settings.exteriorColor ?? '#ffffff'}
            onChange={(event) => onChange({ ...settings, exteriorColor: event.target.value })}
          />
        </label>
        <label className="bay-visual-illumination">
          <span>Intensité RGB</span>
          <span>{Math.round((settings.exteriorBrightness ?? 1) * 100)} %</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round((settings.exteriorBrightness ?? 1) * 100)}
            onChange={(event) =>
              onChange({ ...settings, exteriorBrightness: Number(event.target.value) / 100 })
            }
          />
        </label>
        <label className="bay-visual-switch">
          <span>Capteurs visibles</span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.sensorsVisible}
            onChange={(event) => onChange({ ...settings, sensorsVisible: event.target.checked })}
          />
        </label>
        <label className="bay-visual-switch">
          <span>Toiture visible</span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.canopyVisible}
            onChange={(event) => onChange({ ...settings, canopyVisible: event.target.checked })}
          />
        </label>
      </fieldset>
    </details>
  );
}
