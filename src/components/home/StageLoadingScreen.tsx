/**
 * Covers unfinished studio frames with a quiet preparation screen until real assets and branding are ready.
 * Depends on the stage entrance phase and its scoped CSS; progress is indeterminate rather than fabricated.
 */
export function StageLoadingScreen() {
  return (
    <div className="stage-loading-screen" role="status" aria-live="polite" aria-atomic="true">
      <div className="stage-loading-content">
        <span className="stage-loading-name" aria-hidden="true">
          Cabek AI
        </span>
        <span className="stage-loading-track" aria-hidden="true">
          <span />
        </span>
        <p>Préparation de votre espace…</p>
        <span className="stage-loading-detail">Le studio se met en place.</span>
      </div>
    </div>
  );
}
