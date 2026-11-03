/** Protects backend-sized Moroccan segments and bidirectional lettering without discarding legacy plates; depends on React markup rendering. */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FolderRegistrationPlate } from './FolderRegistrationPlate';

describe('Moroccan plate rendering', () => {
  it.each([
    ['14554-B-4578', '14554', '4578'],
    ['84654-ب-454', '84654', '454'],
    ['123456-A-123456', '123456', '123456'],
  ])('segments %s without truncating either numeric section', (plate, number, region) => {
    const markup = renderToStaticMarkup(<FolderRegistrationPlate matricule={plate} />);
    expect(markup).toContain(`class="folder-registration-number">${number}</span>`);
    expect(markup).toContain(`class="folder-registration-region">${region}</span>`);
    expect(markup).not.toContain('folder-registration-value');
    expect(markup).toContain('lang="ar" dir="rtl"');
    expect(markup).toContain('lang="fr" dir="ltr"');
  });
  it.each(['14554-B-4578', '84654-ب-454'])(
    'preserves the Arabic plate equivalent of %s',
    (plate) => {
      expect(renderToStaticMarkup(<FolderRegistrationPlate matricule={plate} />)).toContain(
        '>ب</bdi>',
      );
    },
  );
  it.each(['LEGACY 123', '', '1234567-B-45'])('keeps a fallback for %s', (plate) => {
    const markup = renderToStaticMarkup(<FolderRegistrationPlate matricule={plate} />);
    expect(markup).toContain('folder-registration-value');
    expect(markup).toContain(plate || 'Non renseignée');
  });
});
