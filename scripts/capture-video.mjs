// ────────────────────────────────────────────────────────────────
// Records the ISCA jury video (≤3 min, 1920×1080, silent) by driving
// the real app with Playwright and saving a WebM, then muxes title
// cards + converts to MP4 with ffmpeg if available.
// Run locally:  npm run build && npx playwright install chromium && node scripts/capture-video.mjs
// Output: docs/video/what-she-wanted-jury.webm (+ .mp4 if ffmpeg present)
// ────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/video');
mkdirSync(out, { recursive: true });

const server = await createServer({ root, server: { port: 5200 } });
await server.listen();

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

await page.goto('http://localhost:5200/', { waitUntil: 'networkidle' });
await wait(3500); // 00:00–00:08 title / moon
await page.getByText(/Read on screen|画面で読む/).click();
await wait(4000); // cover — "the printed page shows what happened"

// 00:20–01:15 — page-alive across several beats
for (const i of [1, 3, 4, 6, 9]) {
  await page.locator('.dot').nth(i).click();
  await wait(5000);
}
// 01:15–01:30 — enter this world
await page.getByText(/Enter this world/i).click().catch(() => {});
await wait(1500);
await page.getByRole('button', { name: /^Enter$|入る/ }).click().catch(() => {});
await wait(800);
await page.getByText(/Drag to look|ドラッグ/).click().catch(() => {});
// 01:30–02:40 — look around the world (programmatic drag sweep)
for (let k = 0; k < 8; k++) {
  await page.mouse.move(1200, 540);
  await page.mouse.down();
  await page.mouse.move(500, 560, { steps: 30 });
  await page.mouse.up();
  await wait(4500);
}
await wait(2000);

await ctx.close(); // finalizes the webm
await browser.close();
await server.close();

// rename newest webm deterministically
const webm = resolve(out, 'what-she-wanted-jury.webm');
try {
  const { readdirSync, statSync } = await import('node:fs');
  const files = readdirSync(out).filter((f) => f.endsWith('.webm')).map((f) => resolve(out, f));
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (files[0] && files[0] !== webm) renameSync(files[0], webm);
} catch {}

// Optional MP4 via ffmpeg
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  execSync(`ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${resolve(out, 'what-she-wanted-jury.mp4')}"`, { stdio: 'inherit' });
  console.log('MP4 written.');
} catch {
  console.log('ffmpeg not found — WebM saved. Convert manually if MP4 is required.');
}
console.log('Video captured →', existsSync(webm) ? webm : '(check docs/video)');
