import type { MetadataWarning } from '../types';

export function MetadataWarnings({ warnings }: { warnings: MetadataWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="metadata-warnings" role="status">
      <strong>Analyse bloquée : informations à corriger</strong>
      <ul>
        {warnings.map((warning) => (
          <li key={`${warning.field}-${warning.code}`}>{warning.message}</li>
        ))}
      </ul>
    </div>
  );
}
