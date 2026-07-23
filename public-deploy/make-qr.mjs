// Generate QR PNG + SVG for the published URL.
//   node public-deploy/make-qr.mjs https://your-site.example/
import QRCode from 'qrcode';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node public-deploy/make-qr.mjs <published-url>');
  process.exit(1);
}
const outDir = dirname(fileURLToPath(import.meta.url));
const opts = { margin: 2, width: 640, errorCorrectionLevel: 'M', color: { dark: '#0a0e1a', light: '#ffffff' } };

const png = await QRCode.toBuffer(url, { ...opts, type: 'png' });
writeFileSync(resolve(outDir, 'what-she-wanted-ar-qr.png'), png);
const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
writeFileSync(resolve(outDir, 'what-she-wanted-ar-qr.svg'), svg);
console.log('Wrote what-she-wanted-ar-qr.png / .svg for', url);
