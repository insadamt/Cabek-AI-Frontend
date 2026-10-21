import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createFixture, mockApi } from './fixtures.mjs';
import { runHomeBrowserChecks } from './home-browser.mjs';

const previewOrigin = 'http://127.0.0.1:5181';
const liveOrigin = 'http://127.0.0.1:5182';
const servers = [];
const errors = [];
let browser;
let passed = 0;

async function startServer(port, baseUrl) {
  const server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { env: { ...process.env, VITE_API_BASE_URL: baseUrl }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  servers.push(server);
  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk;
  });
  server.stderr.on('data', (chunk) => {
    output += chunk;
  });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode != null) throw new Error(`Vite could not start: ${output}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite did not become ready: ${output}`);
}

async function check(name, operation) {
  await operation();
  passed++;
  console.log(`✓ ${name}`);
}

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
  page.on('pageerror', (error) => errors.push(error.message));
  return page;
}

try {
  await mkdir('test-results', { recursive: true });
  await Promise.all([startServer(5181, ''), startServer(5182, 'http://127.0.0.1:5191')]);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox'],
  });
  await runHomeBrowserChecks({ newPage, check, previewOrigin, liveOrigin });
  const page = await newPage();
  await check('Preview is explicit, searchable and paginated', async () => {
    await page.goto(`${previewOrigin}/dossiers`);
    await expect(page.getByText('Aperçu en lecture seule', { exact: false })).toBeVisible();
    await expect(page.locator('.dossier-card')).toHaveCount(6);
    await page.getByRole('textbox', { name: 'Rechercher par dossier' }).fill('Dacia');
    await expect(page.locator('.dossier-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Dacia Sandero' })).toBeVisible();
    await page.getByRole('button', { name: 'Effacer la recherche' }).click();
    await expect(page.locator('.dossier-card')).toHaveCount(6);
    await page.getByRole('button', { name: 'Page suivante' }).click();
    await expect(page.locator('.dossier-card')).toHaveCount(3);
    await page.getByRole('button', { name: 'Page précédente' }).click();
    await expect(page.locator('.dossier-card')).toHaveCount(6);
  });
  await check('Status filters and empty searches retain their context', async () => {
    await page
      .getByRole('group', { name: 'Filtrer par état' })
      .getByRole('button', { name: 'Analysés' })
      .click();
    await expect(page.locator('.dossier-card')).toHaveCount(3);
    await page.getByRole('textbox', { name: 'Rechercher par dossier' }).fill('not-a-vehicle');
    await expect(page.getByRole('heading', { name: 'Aucun dossier ne correspond' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Rechercher par dossier' })).toHaveValue(
      'not-a-vehicle',
    );
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(page.locator('.dossier-card')).toHaveCount(6);
  });
  await check(
    'Comparison retains the slider across modes and supports keyboard/escape',
    async () => {
      await page.getByRole('link', { name: 'Voir le résultat' }).first().click();
      await expect(page.getByRole('button', { name: 'Télécharger le rapport PDF' })).toBeDisabled();
      await page.getByRole('button', { name: 'Comparer les photos' }).click();
      await expect(page.locator('.images-ready')).toBeVisible();
      const slider = page.getByRole('slider');
      await slider.fill('65');
      await page.getByRole('button', { name: 'Dommages', exact: true }).click();
      await expect(page.getByRole('slider')).toHaveValue('65');
      await page.getByRole('slider').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('slider')).toHaveValue('66');
      await expect(page.getByText('Photo 1 sur 5')).toBeVisible();
      await page.getByRole('button', { name: 'Photo suivante' }).click();
      await expect(page.getByRole('slider')).toHaveValue('50');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Comparer les photos' })).toBeFocused();
    },
  );
  await check('Incomplete estimates and genuine zero totals remain distinct', async () => {
    await page.goto(`${previewOrigin}/dossiers/DOS-20261021-0005`);
    await expect(page.getByText('Estimation incomplète', { exact: true })).toBeVisible();
    await expect(page.getByText('Certains montants restent à compléter.')).toBeVisible();
    await expect(page.getByText('Sous-total connu :')).toBeVisible();
    await page.goto(`${previewOrigin}/dossiers/DOS-20261021-0002`);
    await expect(page.getByRole('heading', { name: 'Aucun dommage détecté' })).toBeVisible();
    await expect(page.locator('.estimated-total')).toContainText('0,00');
  });
  await check('Preview never enables a real mutation', async () => {
    await page.goto(`${previewOrigin}/dossiers/DOS-20261021-0009`);
    await expect(page.getByRole('button', { name: 'Lancer l’analyse' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Enregistrer le véhicule' })).toBeDisabled();
  });
  await check('Mobile layouts have no horizontal overflow and navigation works', async () => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${previewOrigin}/dossiers`);
    await expect(page.locator('.dossier-card')).toHaveCount(6);
    await page.waitForTimeout(600);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    expect(
      await page
        .locator('.dossier-card')
        .last()
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe('1');
    await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
    await page.getByRole('link', { name: 'Tous les dossiers' }).click();
    await expect(page.getByRole('heading', { name: 'Vos dossiers, simplement.' })).toBeVisible();
    await page.goto(`${previewOrigin}/dossiers/DOS-20261021-0005`);
    await expect(page.getByText('Estimation incomplète', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: 'test-results/mobile-result.png', fullPage: true });
  });
  await page.close();

  const fixture = createFixture();
  const live = await newPage();
  await mockApi(live, fixture);
  await check('Real API responses surface skipped-dossier warnings', async () => {
    await live.goto(`${liveOrigin}/dossiers`);
    await expect(live.getByText('1 dossier(s) n’ont pas pu être affichés')).toBeVisible();
    await expect(live.getByText('Mode aperçu', { exact: true })).toHaveCount(0);
  });
  await check('Brand/model selection is saved before a single scan request', async () => {
    await live.getByRole('link', { name: 'Ouvrir le dossier' }).click();
    await live.getByRole('combobox', { name: 'Marque du véhicule' }).selectOption('2');
    await expect(live.getByRole('combobox', { name: 'Modèle du véhicule' })).toBeEnabled();
    await live.getByRole('combobox', { name: 'Modèle du véhicule' }).selectOption('20');
    await expect(live.getByRole('button', { name: 'Lancer l’analyse' })).toBeDisabled();
    await live.getByRole('button', { name: 'Enregistrer le véhicule' }).click();
    await expect(live.getByText('Véhicule enregistré', { exact: true })).toBeVisible();
    expect(fixture.putCount).toBe(1);
    await live.getByRole('button', { name: 'Lancer l’analyse' }).click();
    await expect(
      live.getByRole('heading', { name: 'Les derniers détails comptent.' }),
    ).toBeVisible();
    expect(fixture.postCount).toBe(1);
    await expect(live.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await expect(live.getByRole('button', { name: 'Comparer les photos' })).toHaveCount(0);
    await expect(live.getByText('Temps restant estimé', { exact: false })).toHaveCount(0);
  });
  await check(
    'Refreshing restores progress; validated completion opens saved results',
    async () => {
      await live.reload();
      await expect(
        live.getByRole('heading', { name: 'Les derniers détails comptent.' }),
      ).toBeVisible();
      expect(fixture.postCount).toBe(1);
      fixture.status = 'completed';
      await live.getByRole('button', { name: 'Actualiser le dossier' }).click();
      await expect(live.getByRole('button', { name: 'Comparer les photos' })).toBeVisible();
      await expect(live.getByRole('button', { name: 'Lancer l’analyse' })).toHaveCount(0);
      await expect(live.getByRole('combobox')).toHaveCount(0);
      await live.getByText('Pare-chocs avant', { exact: true }).click();
      await expect(live.locator('.damage-table > div')).toHaveCount(3);
    },
  );
  await check('PDF download uses the saved binary response', async () => {
    const downloadEvent = live.waitForEvent('download');
    await live.getByRole('button', { name: 'Télécharger le rapport PDF' }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('rapport_TEST-001.pdf');
  });
  await check(
    'Synchronization failures keep the last result and do not mark the scan failed',
    async () => {
      fixture.offline = true;
      await live.getByRole('button', { name: 'Actualiser le dossier' }).click();
      await expect(live.getByText('Impossible de synchroniser le dossier')).toBeVisible();
      await expect(live.getByRole('button', { name: 'Comparer les photos' })).toBeVisible();
      expect(fixture.postCount).toBe(1);
      fixture.offline = false;
      await live.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await expect(live.getByText('Impossible de synchroniser le dossier')).toHaveCount(0);
    },
  );
  await live.close();

  for (const scenario of ['conflict', 'lostPost']) {
    await check(`${scenario}: reconcile the server state without repeating POST`, async () => {
      const model = createFixture();
      model[scenario] = true;
      const client = await newPage();
      await mockApi(client, model);
      await client.goto(`${liveOrigin}/dossiers/TEST-001`);
      await client.getByRole('button', { name: 'Lancer l’analyse' }).click();
      await expect(
        client.getByRole('heading', {
          name:
            scenario === 'conflict'
              ? 'Voir au-delà de la photo.'
              : 'Les derniers détails comptent.',
        }),
      ).toBeVisible();
      expect(model.postCount).toBe(1);
      await client.close();
    });
  }
  await check('Reduced motion and tablet layouts remain usable', async () => {
    const reduced = await newPage({
      viewport: { width: 768, height: 1024 },
      reducedMotion: 'reduce',
    });
    await reduced.goto(`${previewOrigin}/dossiers`);
    await expect(reduced.locator('.dossier-card')).toHaveCount(6);
    expect(
      await reduced
        .locator('.dossier-card')
        .last()
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe('1');
    expect(
      await reduced.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await reduced.close();
  });
  expect(errors).toEqual([]);
  console.log(`\n${passed} browser checks passed. No uncaught browser errors.`);
} catch (error) {
  console.error(error);
  if (browser) {
    for (const context of browser.contexts())
      for (const page of context.pages())
        await page
          .screenshot({ path: `test-results/failure-${Date.now()}.png`, fullPage: true })
          .catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  servers.forEach((server) => server.kill('SIGTERM'));
}
