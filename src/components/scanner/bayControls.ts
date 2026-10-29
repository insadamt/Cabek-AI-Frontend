/**
 * Defines the visual tunnel settings shared by the screen, WebGL scene and React controls.
 * Depends on no renderer; bounded illumination prevents unusable dark or overexposed previews.
 */
export interface BayVisualSettings {
  illumination: number;
  sensorsVisible: boolean;
  canopyVisible: boolean;
}

export const defaultBayVisualSettings: Readonly<BayVisualSettings> = {
  illumination: 0.75,
  sensorsVisible: true,
  canopyVisible: true,
};

export function normalizeBayVisualSettings(settings: BayVisualSettings): BayVisualSettings {
  return {
    illumination: Number.isFinite(settings.illumination)
      ? Math.min(1, Math.max(0.15, settings.illumination))
      : defaultBayVisualSettings.illumination,
    sensorsVisible: settings.sensorsVisible,
    canopyVisible: settings.canopyVisible,
  };
}
