/**
 * Exports the actual runtime bay geometry and camera endpoints for bounded offline framing review.
 * Saves a reusable tunnel GLB without the studio floor, plus desktop/portrait review inputs in /tmp.
 * Depends on local esbuild, Three.js and the runtime scene builders; requires no browser or renderer.
 */
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = '/tmp/cabek-real-bay-qa';
const tunnelDirectory = join(projectRoot, 'public/models/studio-v2');
await Promise.all([
  mkdir(outputDirectory, { recursive: true }),
  mkdir(tunnelDirectory, { recursive: true }),
]);

// A single bundle keeps exporter and geometry on the same Three.js class instances.

const entry = `
import { writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { PerspectiveCamera, Vector3 } from 'three';
import { buildScanningBay } from './src/components/scanner/bayGeometry.ts';
import { applyBayCamera, vehicleApproachDistance } from './src/components/scanner/bayPresentation.ts';

globalThis.FileReader = class {
  result;
  onloadend;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const bay = buildScanningBay();
try {
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(bay.root, { binary: true });
  await writeFile('${outputDirectory}/runtime-bay.glb', Buffer.from(glb));

  // Exclude the presentation floor so downstream model bounds describe equipment only.

  const studioFloor = bay.root.getObjectByName('Studio floor');
  if (studioFloor) studioFloor.visible = false;
  const tunnelGlb = await exporter.parseAsync(bay.root, { binary: true });
  await writeFile(${JSON.stringify(join(tunnelDirectory, 'cabek-tunnel.glb'))}, Buffer.from(tunnelGlb));
  if (studioFloor) studioFloor.visible = true;

  const compositions = [
    { name: 'desktop-arrival', progress: 0, width: 896, height: 672 },
    { name: 'desktop-parked', progress: 1, width: 896, height: 672 },
    { name: 'portrait-parked', progress: 1, width: 480, height: 800 },
  ];
  const poses = compositions.map(({ name, progress, width, height }) => {
    const aspect = width / height;
    const camera = new PerspectiveCamera(32, aspect, 0.1, 120);
    applyBayCamera(camera, progress, aspect);
    const target = camera.position.clone().add(camera.getWorldDirection(new Vector3()));
    return {
      name,
      progress,
      width,
      height,
      camera: camera.position.toArray(),
      target: target.toArray(),
      vehicleZ: vehicleApproachDistance * (1 - progress),
      verticalFov: camera.fov,
    };
  });
  await writeFile('${outputDirectory}/runtime-poses.json', JSON.stringify(poses, null, 2));
  console.log('Exported reusable studio-v2 tunnel and three bounded review poses to ${outputDirectory}');
} finally {
  bay.dispose();
}
`;

const result = await build({
  stdin: { contents: entry, resolveDir: projectRoot, sourcefile: 'runtime-qa-export.ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
});
const bundlePath = join(outputDirectory, 'runtime-export.mjs');
await writeFile(bundlePath, result.outputFiles[0].text);
await import(pathToFileURL(bundlePath).href);
