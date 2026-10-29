/**
 * Checks labelled native tunnel settings and preserved values during loading and retry.
 * Depends on server-rendered React markup; runtime mutation and GPU disposal have separate tests.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BayVisualControls } from './BayVisualControls';
import { defaultBayVisualSettings } from '../scanner/bayControls';

describe('accessible visual tunnel controls', () => {
  it('labels brightness and both switches and keeps the panel out of category navigation', () => {
    const markup = renderToStaticMarkup(
      <BayVisualControls
        settings={defaultBayVisualSettings}
        disabled={false}
        onChange={() => {}}
      />,
    );
    expect(markup).toContain('Réglages du tunnel');
    expect(markup).toContain('Éclairage');
    expect(markup).toContain('Capteurs visibles');
    expect(markup).toContain('Toiture visible');
    expect(markup).toContain('aria-valuetext="75 pour cent"');
    expect(markup.match(/role="switch"/g)).toHaveLength(2);
    expect(markup.match(/checked=""/g)).toHaveLength(2);
    expect(markup).not.toContain('role="tab"');
    expect(markup).not.toContain('disabled=""');
  });

  it('preserves selected settings while the scene is unavailable', () => {
    const markup = renderToStaticMarkup(
      <BayVisualControls
        settings={{ illumination: 0.35, sensorsVisible: false, canopyVisible: false }}
        disabled
        onChange={() => {}}
      />,
    );
    expect(markup).toContain('<fieldset disabled="">');
    expect(markup).toContain('aria-valuetext="35 pour cent"');
    expect(markup).not.toContain('checked=""');
  });
});
