/** Verify the central settings screen offers manual tests without starting effects.
 * Depends on server-rendered React and mocked fetch; no browser automation. */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Settings } from './Settings';
afterEach(() => vi.unstubAllGlobals());
it('renders settings and light controls without issuing hardware requests', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const markup = renderToStaticMarkup(<Settings />);
  expect(markup).toContain('Paramètres');
  expect(markup).toContain('Mode lent');
  expect(markup).toContain('role="switch"');
  expect(markup).toContain('Diagnostics');
  expect(markup).toContain('Tout tester');
  expect(markup).toContain('Journaux et erreurs');
  expect(markup).toContain('Capture et analyse IA réelles');
  expect(markup).toContain('Éclairage du tunnel');
  expect(markup).toContain('Éteindre');
  expect(markup).toContain('color_cycle');
  expect(markup).toContain('Tester l’éclairage');
  expect(fetcher).not.toHaveBeenCalled();
});
