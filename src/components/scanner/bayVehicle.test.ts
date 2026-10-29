/**
 * Protects supplied-car PBR surfaces, ownership of decoded resources and cancellation during Draco work.
 * Depends on real Three.js scene objects and mocked model transport; no renderer or browser automation runs.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBayVehicle } from './bayVehicle';

const decoding = vi.hoisted(() => ({
  parse: vi.fn(),
  decoderDispose: vi.fn(),
  decoderPath: vi.fn(),
  workerLimit: vi.fn(),
}));

vi.mock('three/addons/loaders/DRACOLoader.js', () => ({
  DRACOLoader: class {
    setDecoderPath(path: string) {
      decoding.decoderPath(path);
      return this;
    }
    setWorkerLimit(limit: number) {
      decoding.workerLimit(limit);
      return this;
    }
    dispose() {
      decoding.decoderDispose();
    }
  },
}));
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setDRACOLoader() {
      return this;
    }
    parseAsync(buffer: ArrayBuffer, path: string) {
      return decoding.parse(buffer, path);
    }
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createDecodedModel() {
  const scene = new THREE.Group();
  scene.position.set(3, 2, -4);
  const geometry = new THREE.BoxGeometry(2.1, 1.5, 4.8);
  const texture = new THREE.Texture();
  const paint = new THREE.MeshStandardMaterial({
    color: '#bfc8bd',
    metalness: 0.38,
    roughness: 0.24,
    map: texture,
    roughnessMap: texture,
    normalMap: texture,
  });
  paint.name = 'CABEK pearl paint';
  const body = new THREE.Mesh(geometry, paint);
  body.name = 'body';
  scene.add(body, new THREE.Mesh(geometry, paint));
  const tires = new THREE.MeshStandardMaterial({ color: '#17191b', roughness: 0.94, metalness: 0 });
  tires.name = 'tire-low';
  const tire = new THREE.Mesh(geometry, tires);
  tire.name = 'tire';
  scene.add(tire);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#26393a',
    roughness: 0.12,
    transmission: 0.28,
    thickness: 0.008,
    transparent: true,
    opacity: 0.82,
  });
  glassMaterial.name = 'Glass_ext-tinted';
  const glass = new THREE.Mesh(geometry, glassMaterial);
  scene.add(glass);
  for (const name of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
    const wheel = new THREE.Group();
    wheel.name = name;
    scene.add(wheel);
  }
  return {
    scene,
    body,
    tire,
    paint,
    glass,
    texture,
    geometryDispose: vi.spyOn(geometry, 'dispose'),
    paintDispose: vi.spyOn(paint, 'dispose'),
    tiresDispose: vi.spyOn(tires, 'dispose'),
    glassDispose: vi.spyOn(glassMaterial, 'dispose'),
    textureDispose: vi.spyOn(texture, 'dispose'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('real vehicle loading', () => {
  it('loads and grounds the supplied sedan while preserving authored PBR layers', async () => {
    const model = createDecodedModel();
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const signal = new AbortController().signal;
    const vehicle = await loadBayVehicle(signal);
    const bounds = new THREE.Box3().setFromObject(vehicle.root);
    const center = bounds.getCenter(new THREE.Vector3());
    expect(bounds.min.y).toBeCloseTo(0);
    expect(center.x).toBeCloseTo(0);
    expect(center.z).toBeCloseTo(0);
    expect(vehicle.wheels.map((wheel) => wheel.name)).toEqual([
      'wheel_fl',
      'wheel_fr',
      'wheel_rl',
      'wheel_rr',
    ]);
    expect(model.body.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const paint = model.body.material as THREE.MeshPhysicalMaterial;
    expect(paint.clearcoat).toBe(0.65);
    expect(paint).toHaveProperty('defines.PHYSICAL', '');
    expect(paint.color.equals(model.paint.color)).toBe(true);
    expect(paint.metalness).toBe(model.paint.metalness);
    expect(paint.roughness).toBe(model.paint.roughness);
    expect(paint.map).toBe(model.texture);
    expect(paint.roughnessMap).toBe(model.texture);
    expect(paint.normalMap).toBe(model.texture);
    expect(model.tire.material.metalness).toBe(0);
    expect(model.tire.material.roughness).toBeGreaterThan(0.8);
    expect(fetch).toHaveBeenCalledWith('/models/studio-v2/cabek-vehicle.glb', { signal });
    expect(decoding.parse).toHaveBeenCalledWith(expect.any(ArrayBuffer), '/models/studio-v2/');
    expect(decoding.decoderPath).toHaveBeenCalledWith('/models/draco/');
    expect(decoding.workerLimit).toHaveBeenCalledWith(2);
    expect(decoding.decoderDispose).toHaveBeenCalledOnce();
    vehicle.dispose();
  });

  it('retains tinted glass and unrelated authored surfaces instead of guessing replacements from mesh names', async () => {
    const model = createDecodedModel();
    const authoredGlass = model.glass.material;
    model.glass.name = 'body';
    const displayMaterial = new THREE.MeshBasicMaterial({ color: '#57dec5' });
    const display = new THREE.Mesh(model.body.geometry, displayMaterial);
    model.scene.add(display);
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const vehicle = await loadBayVehicle(new AbortController().signal);
    expect(model.glass.material).not.toBe(authoredGlass);
    expect(model.glass.material.color.equals(authoredGlass.color)).toBe(true);
    expect(model.glass.material.transmission).toBe(0.28);
    expect(model.glass.material.opacity).toBe(0.82);
    expect(model.glass.castShadow).toBe(false);
    expect(display.material).toBe(displayMaterial);
    vehicle.dispose();
  });

  it('casts the batched solid body shadow while leaving transmissive glazing unshadowed', async () => {
    const model = createDecodedModel();
    model.glass.material.transparent = false;
    model.glass.material.opacity = 1;
    const batchedBody = new THREE.Mesh(model.body.geometry, [model.paint, model.glass.material]);
    model.scene.add(batchedBody);
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const vehicle = await loadBayVehicle(new AbortController().signal);
    expect(batchedBody.castShadow).toBe(true);
    expect(model.glass.castShadow).toBe(false);
    expect(model.glass.material.transmission).toBe(0.28);
    vehicle.dispose();
  });

  it('retains tyre and brushed-metal texture layers while softening their studio highlights', async () => {
    const model = createDecodedModel();
    const rubber = model.tire.material;
    rubber.roughness = 0.25;
    rubber.metalness = 0.15;
    rubber.normalMap = model.texture;
    const alloy = new THREE.MeshStandardMaterial({
      metalness: 1,
      roughness: 0.12,
      map: model.texture,
      normalMap: model.texture,
    });
    alloy.name = 'MetalStainlessSteelBrushedElongated005_2K';
    const wheelAlloy = new THREE.Mesh(model.body.geometry, alloy);
    model.scene.add(wheelAlloy);
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const vehicle = await loadBayVehicle(new AbortController().signal);
    expect(model.tire.material).not.toBe(rubber);
    expect(model.tire.material.roughness).toBeGreaterThan(0.8);
    expect(model.tire.material.metalness).toBeLessThan(0.05);
    expect(model.tire.material.normalMap).toBe(model.texture);
    expect(rubber.roughness).toBe(0.25);
    expect(wheelAlloy.material).not.toBe(alloy);
    expect(wheelAlloy.material.roughness).toBeGreaterThan(alloy.roughness);
    expect(wheelAlloy.material.metalness).toBe(1);
    expect(wheelAlloy.material.map).toBe(model.texture);
    expect(wheelAlloy.material.normalMap).toBe(model.texture);
    vehicle.dispose();
  });

  it('retains authored physical-paint extensions and a stronger existing clearcoat', async () => {
    const model = createDecodedModel();
    const authoredPaint = new THREE.MeshPhysicalMaterial({
      color: '#9daa9f',
      clearcoat: 0.9,
      clearcoatRoughness: 0.07,
      iridescence: 0.08,
      ior: 1.44,
      map: model.texture,
      clearcoatNormalMap: model.texture,
    });
    authoredPaint.name = 'Car_Paint_-_All_Colors';
    model.body.material = authoredPaint;
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const vehicle = await loadBayVehicle(new AbortController().signal);
    const paint = model.body.material as THREE.MeshPhysicalMaterial;
    expect(paint.clearcoat).toBe(0.9);
    expect(paint.clearcoatRoughness).toBe(0.07);
    expect(paint.iridescence).toBe(0.08);
    expect(paint.ior).toBe(1.44);
    expect(paint.map).toBe(model.texture);
    expect(paint.clearcoatNormalMap).toBe(model.texture);
    vehicle.dispose();
  });

  it('releases shared geometry, original materials, replacements and textures exactly once', async () => {
    const model = createDecodedModel();
    decoding.parse.mockResolvedValue({ scene: model.scene });
    const vehicle = await loadBayVehicle(new AbortController().signal);
    const replacementDispose = vi.spyOn(model.body.material, 'dispose');
    const parent = new THREE.Group();
    parent.add(vehicle.root);
    vehicle.dispose();
    vehicle.dispose();
    expect(parent.children).toHaveLength(0);
    expect(vehicle.root.children).toHaveLength(0);
    expect(model.geometryDispose).toHaveBeenCalledOnce();
    expect(model.paintDispose).toHaveBeenCalledOnce();
    expect(model.tiresDispose).toHaveBeenCalledOnce();
    expect(model.glassDispose).toHaveBeenCalledOnce();
    expect(model.textureDispose).toHaveBeenCalledOnce();
    expect(replacementDispose).toHaveBeenCalledOnce();
  });

  it('does not fetch or start a worker for an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadBayVehicle(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
    expect(decoding.parse).not.toHaveBeenCalled();
  });

  it('stops after body loading if navigation cancels before decoding begins', async () => {
    const controller = new AbortController();
    const body = deferred<ArrayBuffer>();
    vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: () => body.promise } as Response);
    const loading = loadBayVehicle(controller.signal);
    await Promise.resolve();
    controller.abort();
    body.resolve(new ArrayBuffer(4));
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(decoding.parse).not.toHaveBeenCalled();
  });

  it('rejects cancellation immediately and releases a subsequently decoded scene without attachment', async () => {
    const model = createDecodedModel();
    const parsed = deferred<{ scene: THREE.Group }>();
    decoding.parse.mockReturnValue(parsed.promise);
    const controller = new AbortController();
    const loading = loadBayVehicle(controller.signal);
    await vi.waitFor(() => expect(decoding.parse).toHaveBeenCalledOnce());
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(decoding.decoderDispose).not.toHaveBeenCalled();
    parsed.resolve({ scene: model.scene });
    await Promise.resolve();
    expect(model.scene.parent).toBeNull();
    expect(model.geometryDispose).toHaveBeenCalledOnce();
    expect(model.paintDispose).toHaveBeenCalledOnce();
    expect(model.tiresDispose).toHaveBeenCalledOnce();
    expect(model.glassDispose).toHaveBeenCalledOnce();
    expect(model.textureDispose).toHaveBeenCalledOnce();
    expect(decoding.decoderDispose).toHaveBeenCalledOnce();
  });

  it('releases the worker and propagates a failed decode', async () => {
    decoding.parse.mockRejectedValue(new Error('Invalid mesh'));
    await expect(loadBayVehicle(new AbortController().signal)).rejects.toThrow('Invalid mesh');
    expect(decoding.decoderDispose).toHaveBeenCalledOnce();
  });

  it('releases a decoded model when cancellation wins just before material preparation', async () => {
    const model = createDecodedModel();
    const parsed = deferred<{ scene: THREE.Group }>();
    decoding.parse.mockReturnValue(parsed.promise);
    const controller = new AbortController();
    const loading = loadBayVehicle(controller.signal);
    await vi.waitFor(() => expect(decoding.parse).toHaveBeenCalledOnce());
    parsed.resolve({ scene: model.scene });
    queueMicrotask(() => controller.abort());
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(model.geometryDispose).toHaveBeenCalledOnce();
    expect(model.paintDispose).toHaveBeenCalledOnce();
    expect(model.tiresDispose).toHaveBeenCalledOnce();
    expect(model.glassDispose).toHaveBeenCalledOnce();
    expect(model.textureDispose).toHaveBeenCalledOnce();
    expect(decoding.decoderDispose).toHaveBeenCalledOnce();
  });

  it('does not invoke the decoder for a failed model response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadBayVehicle(new AbortController().signal)).rejects.toThrow('(404)');
    expect(decoding.parse).not.toHaveBeenCalled();
  });
});
