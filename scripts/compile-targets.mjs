// ────────────────────────────────────────────────────────────────
// Compile a MULTI-target MindAR .mind fully offline, in Node.
//
//   node scripts/compile-targets.mjs <out.mind> <a.rgba> <b.rgba> …
//
// The order of the .rgba files is the tracking index inside the file:
//   index 0, 1, 2, … → whichever printed page you fed, in that order.
//
// Each .rgba is raw 1024×576 RGBA (see the PIL snippet in
// docs/TARGET_GENERATION.md). MindAR's OfflineCompiler only needs a canvas
// that can drawImage → getImageData, so we shim `canvas` with a tiny pure-JS
// stand-in (a fresh `npm install` restores the native node-canvas whose binary
// binding may be unbuilt; this keeps target generation reproducible offline).
// ────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';

const W = 1024, H = 576;
const out = process.argv[2];
const rgbaPaths = process.argv.slice(3);
if (!out || rgbaPaths.length === 0) {
  console.error('usage: node scripts/compile-targets.mjs <out.mind> <a.rgba> [b.rgba …]');
  process.exit(1);
}

// pure-JS canvas shim (drawImage stores the source RGBA; getImageData returns it)
writeFileSync(
  'node_modules/canvas/index.js',
  'function createCanvas(width,height){let s=null;return{width,height,' +
    'getContext(){return{drawImage(img){s=img._rgba;},' +
    'getImageData(x,y,w,h){return{data:s,width:w,height:h};}};}};}\n' +
    'module.exports={createCanvas};module.exports.createCanvas=createCanvas;\n',
);

const { OfflineCompiler } = await import('mind-ar/src/image-target/offline-compiler.js');

const imgs = rgbaPaths.map((p) => {
  const raw = readFileSync(p);
  return { width: W, height: H, _rgba: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength) };
});

console.log(`compiling ${imgs.length} target(s) ${W}x${H} → ${out}`);
const t0 = Date.now();
const compiler = new OfflineCompiler();
await compiler.compileImageTargets(imgs, (p) => process.stdout.write(`  ${Math.round(p)}%\r`));
writeFileSync(out, Buffer.from(compiler.exportData()));
console.log(`\n✓ wrote ${out}  (${(readFileSync(out).byteLength / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s, ${imgs.length} targets)`);
