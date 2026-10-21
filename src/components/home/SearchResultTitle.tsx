import { vehicleName } from '../../lib/format';
import type { DossierSummary } from '../../types';

interface SearchResultTitleProps {
  dossier: DossierSummary;
  search: string;
}

export function SearchResultTitle({ dossier, search }: SearchResultTitleProps) {
  const query = search.trim().toLocaleLowerCase('fr');
  const fields = [
    { label: 'Immatriculation', value: dossier.vehicle.matricule },
    { label: 'Véhicule', value: vehicleName(dossier.vehicle) },
    { label: 'Référence', value: dossier.dossier_id },
  ];
  const matchingFields = query
    ? fields.filter(({ value }) => value?.toLocaleLowerCase('fr').includes(query))
    : [];
  const titleFields = matchingFields.length ? matchingFields : [fields[1]];

  return (
    <p className="home-result-title">
      {titleFields.map(({ label, value }, index) => {
        const pieces: { text: string; matched: boolean }[] = [];
        let position = 0;
        const normalizedValue = value.toLocaleLowerCase('fr');

        // Slice the original text so highlighting preserves registration casing and punctuation.

        while (query && position < value.length) {
          const match = normalizedValue.indexOf(query, position);
          if (match < 0) break;
          if (match > position) pieces.push({ text: value.slice(position, match), matched: false });
          pieces.push({ text: value.slice(match, match + query.length), matched: true });
          position = match + query.length;
        }
        if (position < value.length) pieces.push({ text: value.slice(position), matched: false });
        return (
          <span key={label} title={label}>
            {index > 0 && ' · '}
            <bdi>
              {pieces.map((piece, pieceIndex) =>
                piece.matched ? (
                  <mark key={pieceIndex}>{piece.text}</mark>
                ) : (
                  <span key={pieceIndex}>{piece.text}</span>
                ),
              )}
            </bdi>
          </span>
        );
      })}
    </p>
  );
}
