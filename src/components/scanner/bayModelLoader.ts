/** Fetch and decode independently owned studio assets with local Draco workers.
 * Depends on Three.js GLTFLoader and bayModelResources for cancelled loads.
 */
import type * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createResourceOwner } from './bayModelResources';

function abortError() {
  return new DOMException('Model loading was cancelled.', 'AbortError');
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw abortError();
}

function releaseDecodedScene(scene: THREE.Group) {
  const resources = createResourceOwner();
  resources.capture(scene);
  resources.dispose();
}

export async function loadBayModel(url: string, signal: AbortSignal): Promise<GLTF> {
  throwIfAborted(signal);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Studio model could not be loaded (${response.status}).`);
  const buffer = await response.arrayBuffer();
  throwIfAborted(signal);
  const directory = url.slice(0, url.lastIndexOf('/') + 1);
  const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(decoder);

  return new Promise((resolve, reject) => {
    const rejectCancelledLoad = () => reject(abortError());
    signal.addEventListener('abort', rejectCancelledLoad, { once: true });

    //
    // Terminating a busy Draco worker leaves parsing pending, so late scenes must be released after decoding.
    //
    loader.parseAsync(buffer, directory).then(
      (gltf) => {
        signal.removeEventListener('abort', rejectCancelledLoad);
        decoder.dispose();
        if (signal.aborted) {
          releaseDecodedScene(gltf.scene);
          reject(abortError());
          return;
        }
        resolve(gltf);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', rejectCancelledLoad);
        decoder.dispose();
        reject(signal.aborted ? abortError() : error);
      },
    );
  });
}
