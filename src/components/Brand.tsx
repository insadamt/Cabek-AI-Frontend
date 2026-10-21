export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="CABEK AI">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M25 8H15a8 8 0 1 0 0 16h10M22 14h-8a2 2 0 0 0 0 4h8"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="brand-word">
          cabek<span className="brand-ai">ai</span>
          <span className="brand-period">.</span>
        </span>
      )}
    </div>
  );
}
