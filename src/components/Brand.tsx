interface BrandProps {
  compact?: boolean;
  tone?: 'dark' | 'light';
}

export function Brand({ compact = false, tone = 'dark' }: BrandProps) {
  // Match the supplied artwork to its surface so the logo keeps its contrast.
  return (
    <div className={`brand brand-${tone}`} role="img" aria-label="Cabek AI">
      <img
        className="brand-mark"
        src={`/images/cabek-ai-logo-${tone === 'light' ? 'white' : 'black'}.png`}
        alt=""
        width={36}
        height={36}
      />
      {!compact && (
        <span className="brand-word">
          Cabek <span className="brand-ai">AI</span>
        </span>
      )}
    </div>
  );
}
