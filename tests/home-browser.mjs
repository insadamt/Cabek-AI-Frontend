import { expect } from '@playwright/test';

export async function runHomeBrowserChecks({ newPage, check, previewOrigin, liveOrigin }) {
  const home = await newPage({ viewport: { width: 1440, height: 900 } });
  const activeFolder = home.locator('.carousel-folder-slot.is-active');

  await check('Minimal home fills the viewport and browses plain folders', async () => {
    await home.goto(previewOrigin);
    await expect(activeFolder).toHaveAccessibleName(/Renault Clio/);
    await expect(
      home.locator('.folder-vehicle-drawing, .home-selection, .home-filters, .home-footer, img'),
    ).toHaveCount(0);
    await expect(home.locator('.carousel-folder-slot')).toHaveCount(3);
    await home.getByRole('button', { name: 'Dossier suivant', exact: true }).click();
    await expect(activeFolder).toHaveAccessibleName(/Dacia Sandero/);
    await activeFolder.focus();
    await home.keyboard.press('ArrowRight');
    await expect(activeFolder).toHaveAccessibleName(/Peugeot 208/);
    await home.keyboard.press('ArrowLeft');
    await expect(activeFolder).toHaveAccessibleName(/Dacia Sandero/);
    await home.waitForTimeout(650);
    await home.screenshot({ path: 'test-results/home-desktop.png' });
    for (const [width, height] of [
      [1440, 900],
      [1366, 768],
      [768, 1024],
      [390, 844],
      [320, 740],
      [844, 390],
    ]) {
      await home.setViewportSize({ width, height });
      expect(
        await home.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        })),
      ).toEqual({ width, height });
      await expect(home.getByRole('link', { name: /Ouvrir le dossier DOS/ })).toBeVisible();
    }
    await home.setViewportSize({ width: 1440, height: 900 });
  });

  await check('Minimal home supports dragging, opening and returning to a dossier', async () => {
    await home.goto(previewOrigin);
    const folder = await activeFolder.boundingBox();
    const x = folder.x + folder.width / 2;
    const y = folder.y + folder.height / 2;
    await home.mouse.move(x, y);
    await home.mouse.down();
    await home.mouse.move(x - 110, y + 2, { steps: 8 });
    await home.mouse.up();
    await expect(activeFolder).toHaveAccessibleName(/Dacia Sandero/);
    await home.getByRole('link', { name: /Ouvrir le dossier DOS/ }).click();
    await expect(home.getByRole('button', { name: 'Comparer les photos' })).toBeVisible();
    await home.goBack();
    await expect(activeFolder).toHaveAccessibleName(/Dacia Sandero/);
    await home.emulateMedia({ reducedMotion: 'reduce' });
    await home.getByRole('button', { name: 'Dossier suivant', exact: true }).click();
    await expect(activeFolder).toHaveAccessibleName(/Peugeot 208/);
    await home.close();
  });

  await check('Minimal mobile home supports touch swipe without page overflow', async () => {
    const mobile = await newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await mobile.goto(previewOrigin);
    const folder = await mobile.locator('.carousel-folder-slot.is-active').boundingBox();
    const x = folder.x + folder.width / 2;
    const y = folder.y + folder.height / 2;
    const touch = await mobile.context().newCDPSession(mobile);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let distance = 15; distance <= 100; distance += 15)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - distance, y }],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(mobile.locator('.carousel-folder-slot.is-active')).toHaveAccessibleName(
      /Dacia Sandero/,
    );
    await mobile.waitForTimeout(650);
    await mobile.screenshot({ path: 'test-results/home-mobile.png' });
    await mobile.getByRole('link', { name: 'Dossiers', exact: true }).click();
    await expect(mobile.getByRole('heading', { name: 'Vos dossiers, simplement.' })).toBeVisible();
    await mobile.close();
  });

  await check('Carousel arrows cross API pages, wrap and recover from errors', async () => {
    const paginated = await newPage();
    let mode = 'collection';
    const dossiers = Array.from({ length: 27 }, (_, index) => ({
      dossier_id: `DOS-${index}`,
      vehicle: { marque: 'Dacia', modele: `Véhicule ${index}`, matricule: `${index} A 6` },
      created_at: null,
      photo_count: index,
      status: 'not_analyzed',
    }));
    await paginated.route('**/api/dossiers?*', (route) => {
      if (mode === 'error') return route.abort('connectionrefused');
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      const total = mode === 'empty' ? 0 : dossiers.length;
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: total ? dossiers.slice(offset, offset + limit) : [],
          total,
          counts: {
            all: total,
            not_analyzed: total,
            queued: 0,
            processing: 0,
            completed: 0,
            failed: 0,
          },
          offset,
          limit,
          warnings: [],
        }),
      });
    });
    const selected = paginated.locator('.carousel-folder-slot.is-active');
    await paginated.goto(`${liveOrigin}/?slide=11`);
    await expect(selected).toHaveAccessibleName(/Véhicule 11,/);
    await paginated.getByRole('button', { name: 'Dossier suivant', exact: true }).click();
    await expect(selected).toHaveAccessibleName(/Véhicule 12,/);
    await paginated.getByRole('button', { name: 'Dossier précédent', exact: true }).click();
    await expect(selected).toHaveAccessibleName(/Véhicule 11,/);
    await paginated.goto(`${liveOrigin}/?slide=26`);
    await expect(selected).toHaveAccessibleName(/Véhicule 26,/);
    await paginated.getByRole('button', { name: 'Dossier suivant', exact: true }).click();
    await expect(selected).toHaveAccessibleName(/Véhicule 0,/);
    await paginated.getByRole('button', { name: 'Dossier précédent', exact: true }).click();
    await expect(selected).toHaveAccessibleName(/Véhicule 26,/);
    mode = 'empty';
    await paginated.goto(liveOrigin);
    await expect(paginated.getByText('Aucun dossier')).toBeVisible();
    mode = 'error';
    await paginated.reload();
    await expect(paginated.getByRole('button', { name: 'Réessayer' })).toBeVisible();
    mode = 'collection';
    await paginated.getByRole('button', { name: 'Réessayer' }).click();
    await expect(selected).toHaveAccessibleName(/Véhicule 0,/);
    await paginated.close();
  });
}
