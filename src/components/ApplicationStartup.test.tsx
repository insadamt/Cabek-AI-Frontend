/** Verify initial and deep-linked routes stay behind the themed startup gate.
 * Depends on server markup and the runtime-cache boundary; GPU readiness remains covered by cache tests and manual checks. */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('./home/BayRuntimeCacheProvider', () => ({ useBayRuntimeCache: () => ({}) }));
import { ApplicationStartup } from './ApplicationStartup';

it('hides route controls until shared resources are prepared', () => {
  const markup = renderToStaticMarkup(
    <ApplicationStartup>
      <button>Scanner</button>
    </ApplicationStartup>,
  );
  expect(markup).toContain('Préparation de votre espace');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain('application-startup-scene');
  expect(markup).not.toContain('<button>Scanner</button>');
});
