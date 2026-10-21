import { expect } from '@playwright/test';
import { createFixture, mockApi } from './fixtures.mjs';

export async function runFolderDocumentChecks({ newPage, check, previewOrigin, liveOrigin }) {
  await check(
    'Hover opens the pocket; click extracts the document; outside press and browsing return it',
    async () => {
      const page = await newPage();
      await page.goto(previewOrigin);
      const activeCover = page.locator('.carousel-folder-slot.is-active .folder-cover');
      await expect(activeCover).toHaveAttribute('aria-expanded', 'false');
      await activeCover.hover();
      await expect(page.locator('.carousel-folder-slot.is-active .dossier-folder')).toHaveClass(
        /folder-mouth-open/,
      );
      await expect(activeCover).toHaveAttribute('aria-expanded', 'false');
      await activeCover.click();
      await expect(activeCover).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('article', { name: /Fiche véhicule/ })).toHaveCount(1);
      await activeCover.click();
      await expect(activeCover).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('article', { name: /Fiche véhicule/ }).click();
      await expect(activeCover).toHaveAttribute('aria-expanded', 'true');
      await page.mouse.click(35, 120);
      await expect(activeCover).toHaveAttribute('aria-expanded', 'false');
      await activeCover.focus();
      await page.keyboard.press('Enter');
      await expect(activeCover).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(activeCover).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Space');
      await expect(activeCover).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('button', { name: 'Dossier suivant', exact: true }).click();
      await expect(page.locator('.carousel-counter')).toHaveText('02 / 09');
      await expect(activeCover).toHaveAttribute('aria-expanded', 'false');
      await page.close();
    },
  );

  await check(
    'Document shows real summary details on desktop and touch without photo requests',
    async () => {
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
        [320, 740],
        [844, 390],
      ]) {
        const page = await newPage({ viewport: { width, height }, hasTouch: true });
        const fixture = createFixture();
        await mockApi(page, fixture);
        const requests = [];
        page.on('request', (request) => requests.push(request.url()));
        await page.goto(liveOrigin);
        const cover = page.locator('.folder-cover');
        await cover.tap();
        await expect(cover).toHaveAttribute('aria-expanded', 'true');
        const document = page.getByRole('article', { name: 'Fiche véhicule TEST-001' });
        await expect(document.locator('dd')).toHaveText([
          'Dacia',
          'Sandero',
          'TEST · A · 6',
          '2022',
          '2',
        ]);
        await page.waitForTimeout(600);
        const paper = await document.boundingBox();
        expect(paper.y).toBeGreaterThanOrEqual(width <= 650 ? 85 : 65);
        expect(paper.x).toBeGreaterThanOrEqual(0);
        expect(paper.x + paper.width).toBeLessThanOrEqual(width);
        await page.screenshot({ path: `test-results/folder-document-${width}x${height}.png` });
        expect(
          requests.some((url) => /\/(photos|result|scan)(\?|$)|\/images\//.test(url)),
        ).toBeFalsy();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth === innerWidth &&
              document.documentElement.scrollHeight === innerHeight,
          ),
        ).toBeTruthy();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.touchscreen.tap(35, 120);
        await expect(cover).toHaveAttribute('aria-expanded', 'false');
        await page.close();
      }
    },
  );
}
