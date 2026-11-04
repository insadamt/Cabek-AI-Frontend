/** Guards the visible rotation-lock control on the prepared studio; depends on real markup and a ready runtime adapter. */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CategoryStageVisual } from './CategoryStageVisual';
import { categories } from '../../lib/workflows';

vi.mock('./BayRuntimeCacheProvider', () => ({
  useBayRuntimeCache: () => ({ getSnapshot: () => ({ status: 'ready', introComplete: true }) }),
}));

it('shows an explicit locked rotation button beside Reset before scanning', () => {
  const markup = renderToStaticMarkup(
    <CategoryStageVisual
      category={categories[1]}
      initiallyParked
      waitingOutside
      playIntro
      onStatusChange={vi.fn()}
    />,
  );
  expect(markup).toContain('data-rotation-locked="true"');
  expect(markup).toContain('aria-label="Verrouillage de la rotation" aria-pressed="true"');
  expect(markup).toContain('Déverrouiller la rotation');
  expect(markup).toContain('Réinitialiser la vue');
  expect(markup).not.toContain('Passer l’introduction');
});
