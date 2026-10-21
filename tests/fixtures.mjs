import { readFile } from 'node:fs/promises';

export const API_ORIGIN = 'http://127.0.0.1:5191';
const vehicle = {
  marque: 'Dacia',
  modele: 'Sandero',
  matricule: 'TEST · A · 6',
  annee: '2022',
  date_sinistre: null,
  marque_id: null,
  model_id: null,
};
const financial = {
  status: 'complete',
  currency: 'MAD',
  estimated_total: 1660,
  known_subtotal: 1660,
  breakdown: {
    repair_labor: 660,
    paint_labor: 420,
    paint_materials: 580,
    replacement_labor: 0,
    parts_supply: 0,
  },
  warnings: [],
};

export function createFixture() {
  return {
    status: 'not_analyzed',
    vehicle: { ...vehicle },
    postCount: 0,
    putCount: 0,
    conflict: false,
    lostPost: false,
    offline: false,
    resultReadCount: 0,
  };
}

export function resultResponse(fixture) {
  const active = ['queued', 'processing'].includes(fixture.status);
  return {
    dossier_id: 'TEST-001',
    status: fixture.status,
    error:
      fixture.status === 'failed' ? { code: 'scan_timeout', message: 'The scan failed.' } : null,
    progress: active
      ? {
          stage: 'finalizing',
          photos_total: 2,
          photos_completed: 2,
          annotations_ready: 6,
          annotations_expected: 6,
          elapsed_seconds: 12,
          eta_seconds: null,
          result_ready: false,
          report_ready: false,
        }
      : null,
    result:
      fixture.status === 'completed'
        ? {
            schema_version: 1,
            vehicle: fixture.vehicle,
            financial,
            parts: [
              {
                part_id: 'bumper',
                name: 'Pare-chocs avant',
                action: 'repair',
                financial,
                detection_ids: ['repeated'],
                source_images: ['original.svg'],
              },
            ],
            detections: [
              { detection_id: 'repeated', type: 'Rayure', niveau: 'low', confiance: 0.8 },
              { detection_id: 'repeated', type: 'Déformation', niveau: 'high', confiance: 0.9 },
            ],
            photos: [
              {
                photo_id: 'vue_avant',
                original_url: '/images/vehicle.svg',
                parts_url: '/images/parts.svg',
                damages_url: '/images/damages.svg',
              },
            ],
            report_url: '/api/dossiers/TEST-001/report',
          }
        : null,
  };
}

export async function mockApi(page, fixture) {
  await page.route(/\/(api|images)\//, async (route) => {
    if (fixture.offline) return route.abort('connectionrefused');
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
      'access-control-allow-headers': 'accept,content-type',
    };
    const json = (value, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/api/dossiers') {
      const summary = {
        dossier_id: 'TEST-001',
        vehicle: fixture.vehicle,
        created_at: '2026-10-21T10:00:00',
        photo_count: 2,
        status: fixture.status,
      };
      const matching =
        !url.searchParams.get('status') || url.searchParams.get('status') === fixture.status;
      const counts = {
        all: 1,
        not_analyzed: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        [fixture.status]: 1,
      };
      return json({
        items: matching ? [summary] : [],
        total: matching ? 1 : 0,
        counts,
        limit: 6,
        offset: 0,
        warnings: [
          { dossier_id: 'INVALID-001', code: 'invalid_result', message: 'Invalid saved data.' },
        ],
      });
    }
    if (url.pathname === '/api/vehicles/marques')
      return json([
        { id: 1, libelle: 'Dacia' },
        { id: 2, libelle: 'Renault' },
      ]);
    if (url.pathname === '/api/vehicles/models') {
      const brand = Number(url.searchParams.get('marque_id'));
      return json([
        { id: brand * 10, marque_id: brand, libelle: brand === 1 ? 'Sandero' : 'Clio' },
      ]);
    }
    if (url.pathname.endsWith('/vehicle')) {
      fixture.putCount++;
      const selection = request.postDataJSON();
      fixture.vehicle = {
        ...fixture.vehicle,
        ...selection,
        marque: selection.marque_id === 1 ? 'Dacia' : 'Renault',
        modele: selection.marque_id === 1 ? 'Sandero' : 'Clio',
      };
      return json(fixture.vehicle);
    }
    if (url.pathname.endsWith('/scan')) {
      fixture.postCount++;
      fixture.status = fixture.conflict ? 'completed' : 'processing';
      if (fixture.lostPost) return route.abort('failed');
      if (fixture.conflict)
        return json({ error: { code: 'already_analyzed', message: 'Already analyzed.' } }, 409);
      return json({ ...resultResponse(fixture), status: 'queued' }, 202);
    }
    if (url.pathname.endsWith('/result')) {
      fixture.resultReadCount++;
      return json(resultResponse(fixture));
    }
    if (url.pathname.endsWith('/report'))
      return route.fulfill({
        status: 200,
        headers: {
          ...headers,
          'content-disposition': 'attachment; filename="rapport_TEST-001.pdf"',
        },
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4\n%%EOF'),
      });
    if (url.pathname.startsWith('/images/'))
      return route.fulfill({
        status: 200,
        headers,
        contentType: 'image/svg+xml',
        body: await readFile(
          new URL(`../public/preview/${url.pathname.split('/').at(-1)}`, import.meta.url),
        ),
      });
    return json({ error: { code: 'dossier_not_found', message: 'Not found.' } }, 404);
  });
}
