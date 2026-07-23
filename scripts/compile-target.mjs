// ────────────────────────────────────────────────────────────────
// Generate a MindAR image-target file (.mind) fully offline, in Node.
//
//   node scripts/compile-target.mjs <source.jpg> <out.mind> [width height]
//
// How it works: MindAR's OfflineCompiler grayscales each target from a canvas'
// getImageData. We feed it pre-decoded RGBA (from PIL via scripts/make-target.sh)
// through a tiny pure-JS 'canvas' shim, so no native node-canvas build is needed.
// Feature extraction runs on tfjs' CPU backend.
// ────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const rgbaPath = process.argv[2] || '/sessions/affectionate-youthful-johnson/p4.rgba';
const outPath = process.argv[3] || 'public/targets/forest-page.mind';
const width = parseInt(process.argv[4] || '1024', 10);
const height = parseInt(process.argv[5] || '576', 10);

const raw = readFileSync(rgbaPath);
const img = { width, height, _rgba: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength) };

console.log(`compiling target ${width}x${height} …`);
const t0 = Date.now();
const compiler = new OfflineCompiler();
await compiler.compileImageTargets([img], (p) => {
  if (Math.round(p) % 10 === 0) process.stdout.write(`  ${Math.round(p)}%\r`);
});
const buffer = compiler.exportData();
writeFileSync(outPath, Buffer.from(buffer));
console.log(`\n✓ wrote ${outPath}  (${(buffer.byteLength / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
