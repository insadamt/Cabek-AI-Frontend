import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierResponse } from '../types';
import { prepareDossierImages } from './dossierImages';
import { getPreparedImage, retainPreparedImages } from './preparedImages';

const mocks = vi.hoisted(() => ({ read: vi.fn(), load: vi.fn() }));
vi.mock('./api', () => ({
  readDossier: mocks.read,
  resolveMediaUrl: (url: string) => `/resolved${url}`,
}));
vi.mock('./comparisonImages', () => ({ preloadImage: mocks.load }));

function resultWithPhotos(count = 1): DossierResponse {
  return {
    dossier_id: 'DOS-001',
    status: 'completed',
    progress: null,
    error: null,
    result: {
      photos: Array.from({ length: count }, (_, index) => ({
        photo_id: `photo-${index}`,
        original_url: `/original-${index}`,
        parts_url: `/parts-${index}`,
        damages_url: `/damages-${index}`,
        critical_url: `/critical-${index}`,
      })),
    } as DossierResponse['result'],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  retainPreparedImages(new Map());
  mocks.read.mockResolvedValue(resultWithPhotos());
  mocks.load.mockImplementation((src: string) => Promise.resolve({ src }));
});
afterEach(() => retainPreparedImages(new Map()));

describe('all visible dossier images prepared during opening', () => {
  it('prepares all visible WebP previews without critical images, preserving full media URLs', async () => {
    const response = resultWithPhotos();
    Object.assign(response.result!.photos[0], {
      original_preview_url: '/preview/original.webp',
      parts_preview_url: '/preview/parts.webp',
      damages_preview_url: '/preview/damages.webp',
      critical_preview_url: '/preview/critical.webp',
    });
    mocks.read.mockResolvedValue(response);
    const prepared = await prepareDossierImages({
      dossierId: 'DOS-001',
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });
    expect(mocks.load.mock.calls.map(([source]) => source)).toEqual([
      '/resolved/preview/original.webp',
      '/resolved/preview/parts.webp',
      '/resolved/preview/damages.webp',
    ]);
    expect(getPreparedImage('/resolved/preview/parts.webp')?.src).toBe('/resolved/preview/parts.webp');
    expect(prepared.result!.photos[0].original_url).toBe('/original-0');
  });

  it('loads original, parts and damages with real progress and retains decoded assets', async () => {
    const onProgress = vi.fn();
    await prepareDossierImages({
      dossierId: 'DOS-001',
      signal: new AbortController().signal,
      onProgress,
    });
    expect(mocks.load.mock.calls.map(([source]) => source)).toEqual([
      '/resolved/original-0',
      '/resolved/parts-0',
      '/resolved/damages-0',
    ]);
    expect(onProgress.mock.calls).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    expect(getPreparedImage('/resolved/parts-0')?.src).toBe('/resolved/parts-0');
  });
  it('deduplicates shared URLs and handles empty collections without waiting', async () => {
    const response = resultWithPhotos();
    response.result!.photos[0].parts_url = response.result!.photos[0].original_url;
    response.result!.photos[0].damages_url = response.result!.photos[0].original_url;
    mocks.read.mockResolvedValueOnce(response).mockResolvedValueOnce(resultWithPhotos(0));
    const options = {
      dossierId: 'DOS-001',
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    };
    await prepareDossierImages(options);
    expect(mocks.load).toHaveBeenCalledTimes(1);
    await prepareDossierImages(options);
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it('starts every photo and visible annotation concurrently and waits for all of them', async () => {
    mocks.read.mockResolvedValue(resultWithPhotos(30));
    const finish: Array<() => void> = [];
    mocks.load.mockImplementation(
      (src: string) => new Promise((resolve) => finish.push(() => resolve({ src }))),
    );
    const completed = vi.fn();
    const task = prepareDossierImages({
      dossierId: 'DOS-001',
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });
    void task.then(completed);
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(90));
    finish.shift()!();
    await Promise.resolve();
    expect(completed).not.toHaveBeenCalled();
    finish.splice(0).forEach((resolve) => resolve());
    await task;
    expect(completed).toHaveBeenCalledOnce();
    expect(mocks.load.mock.calls.map(([source]) => source)).toContain('/resolved/damages-29');
    expect(mocks.load.mock.calls.some(([source]) => source.includes('critical'))).toBe(false);
  });
  it('stops other loads and does not publish a partial cache when an image fails', async () => {
    const signals: AbortSignal[] = [];
    mocks.load.mockImplementation((_source: string, signal: AbortSignal) => {
      signals.push(signal);
      return Promise.reject(new Error('missing'));
    });
    await expect(
      prepareDossierImages({
        dossierId: 'DOS-001',
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('Une image n’a pas pu être chargée');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(getPreparedImage('/resolved/original-0')).toBeUndefined();
  });
  it('cancels pending requests when opening is cancelled', async () => {
    const controller = new AbortController();
    mocks.load.mockImplementation(
      (_source: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const task = prepareDossierImages({
      dossierId: 'DOS-001',
      signal: controller.signal,
      onProgress: vi.fn(),
    });
    const rejection = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(3));
    controller.abort();
    await rejection;
  });
});
