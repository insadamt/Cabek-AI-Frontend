interface FolderRegistrationPlateProps {
  matricule: string;
}

// Registration series use their plate equivalents, which differ from phonetic transliteration.

const arabicRegistrationLetters: Record<string, string> = {
  A: 'أ',
  B: 'ب',
  D: 'د',
  H: 'ه',
  E: 'و',
  T: 'ط',
  Y: 'ي',
  K: 'ك',
  L: 'ل',
  M: 'م',
  N: 'ن',
  C: 'ص',
  F: 'ف',
  R: 'ر',
  S: 'س',
};

function resolveRegistrationLetters(letter: string) {
  const normalizedLetter = letter.normalize('NFC').replace(/ـ/g, '').toUpperCase();
  const arabicLetter = arabicRegistrationLetters[normalizedLetter];
  if (arabicLetter) return { arabic: arabicLetter, latin: normalizedLetter };

  const latinLetter = Object.keys(arabicRegistrationLetters).find(
    (latin) => arabicRegistrationLetters[latin] === normalizedLetter,
  );
  if (latinLetter) return { arabic: normalizedLetter, latin: latinLetter };
  if (normalizedLetter === 'ا') return { arabic: letter, latin: 'A' };
  return null;
}

export function FolderRegistrationPlate({ matricule }: FolderRegistrationPlateProps) {
  const registration = matricule.trim();

  // Keep unfamiliar registrations intact rather than guessing missing plate segments.

  const segments = registration.match(
    /^(\d{1,5})\s*[-·|]\s*(\p{L}[\p{M}ـ]*)\s*[-·|]\s*(\d{1,2})$/u,
  );
  const letters = segments ? resolveRegistrationLetters(segments[2]) : null;

  return (
    <span className="folder-registration-plate" aria-hidden="true" dir="ltr">
      <span className="folder-registration-country">MA</span>
      {segments ? (
        <>
          <span className="folder-registration-number">{segments[1]}</span>
          <span
            className={`folder-registration-letter${letters ? ' folder-registration-letter-pair' : ''}`}
          >
            {letters ? (
              <>
                <bdi lang="ar" dir="rtl">
                  {letters.arabic}
                </bdi>
                <bdi lang="fr" dir="ltr">
                  {letters.latin}
                </bdi>
              </>
            ) : (
              <bdi>{segments[2]}</bdi>
            )}
          </span>
          <span className="folder-registration-region">{segments[3]}</span>
        </>
      ) : (
        <bdi className="folder-registration-value">{registration || 'Non renseignée'}</bdi>
      )}
    </span>
  );
}
