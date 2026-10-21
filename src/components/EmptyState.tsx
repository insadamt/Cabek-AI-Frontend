import { FolderSearch, RefreshCw } from 'lucide-react';

export function EmptyState({
  title,
  description,
  onRetry,
  actionLabel = 'Réessayer',
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FolderSearch size={27} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          <RefreshCw size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
