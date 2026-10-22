import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preloadComparisonImages, preloadImage } from './comparisonImages';
import { retainPreparedImages } from './preparedImages';

vi.mock('./api', () => ({ resolveMediaUrl: (source: string) => source }));

class TestImage {
  static instances: TestImage[] = [];
  src = '';
  onload: (() => Promise<void>) | null = null;
  onerror: (() => void) | null = null;
  decode = vi.fn(() => Promise.resolve());
  removeAttribute = vi.fn();
  constructor() {
    TestImage.instances.push(this);
  }
}

const photo = {
  photo_id: 'front',
  original_url: '/original',
  parts_url: '/parts',
  damages_url: '/damages',
};

beforeEach(() => {
  retainPreparedImages(new Map());
  TestImage.instances = [];
  vi.stubGlobal('Image', TestImage);
});
afterEach(() => vi.unstubAllGlobals());

describe('comparison image preparation', () => {
  it.each(['parts', 'damages'] as const)('reuses decoded WebP previews for %s', async (mode) => {
    const previewPhoto = {
      ...photo,
      original_preview_url: '/preview/original.webp',
      parts_preview_url: '/preview/parts.webp',
      damages_preview_url: '/preview/damages.webp',
    };
    retainPreparedImages(new Map([
      [previewPhoto.original_preview_url, {} as HTMLImageElement],
      [previewPhoto[`${mode}_preview_url`], {} as HTMLImageElement],
    ]));
    const pair = await preloadComparisonImages(previewPhoto, mode, new AbortController().signal);
    expect(pair.originalUrl).toBe('/preview/original.webp');
    expect(pair.annotationUrl).toBe(`/preview/${mode}.webp`);
    expect(TestImage.instances).toHaveLength(0);
  });

  it('falls back per image when a response contains only some previews', async () => {
    const task = preloadComparisonImages(
      { ...photo, original_preview_url: '/preview/original.webp' },
      'damages',
      new AbortController().signal,
    );
    expect(TestImage.instances.map((image) => image.src)).toEqual(['/preview/original.webp', '/damages']);
    await Promise.all(TestImage.instances.map((image) => image.onload!()));
    await task;
  });

  it('reuses decoded opening images without starting another download', async () => {
    const original = new TestImage() as unknown as HTMLImageElement;
    const annotation = new TestImage() as unknown as HTMLImageElement;
    retainPreparedImages(
      new Map([
        ['/original', original],
        ['/parts', annotation],
      ]),
    );
    const count = TestImage.instances.length;
    const pair = await preloadComparisonImages(photo, 'parts', new AbortController().signal);
    expect(pair.annotationUrl).toBe('/parts');
    expect(TestImage.instances).toHaveLength(count);
  });
  it('keeps the next pair pending until both images have decoded', async () => {
    const controller = new AbortController();
    const task = preloadComparisonImages(photo, 'parts', controller.signal);
    const settled = vi.fn();
    void task.then(settled);
    const [original, annotation] = TestImage.instances;
    await original.onload!();
    expect(settled).not.toHaveBeenCalled();
    await annotation.onload!();
    expect(await task).toEqual({
      photoId: 'front',
      mode: 'parts',
      originalUrl: '/original',
      annotationUrl: '/parts',
    });
    expect(original.decode).toHaveBeenCalledOnce();
    expect(annotation.decode).toHaveBeenCalledOnce();
  });

  it('loads the requested annotation mode', async () => {
    const task = preloadComparisonImages(photo, 'damages', new AbortController().signal);
    expect(TestImage.instances[1].src).toBe('/damages');
    await Promise.all(TestImage.instances.map((image) => image.onload!()));
    expect((await task).mode).toBe('damages');
  });

  it('cancels a superseded pair and removes image event handlers', async () => {
    const controller = new AbortController();
    const task = preloadComparisonImages(photo, 'parts', controller.signal);
    const rejection = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    for (const image of TestImage.instances) {
      expect(image.onload).toBeNull();
      expect(image.onerror).toBeNull();
      expect(image.removeAttribute).toHaveBeenCalledWith('src');
    }
  });

  it('rejects an image that fails so the caller can retain the previous pair', async () => {
    const task = preloadImage('/missing', new AbortController().signal);
    const rejection = expect(task).rejects.toThrow('Image unavailable');
    TestImage.instances[0].onerror!();
    await rejection;
    expect(TestImage.instances[0].onload).toBeNull();
  });

  it('does not publish an image when cancellation happens during decoding', async () => {
    const controller = new AbortController();
    const task = preloadImage('/slow-decode', controller.signal);
    const rejection = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    let finishDecoding!: () => void;
    const image = TestImage.instances[0];
    image.decode.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishDecoding = resolve;
        }),
    );
    const loading = image.onload!();
    controller.abort();
    finishDecoding();
    await loading;
    await rejection;
  });
});
