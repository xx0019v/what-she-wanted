// ────────────────────────────────────────────────────────────────
// Browser QA — boots the built app, walks the core flow, captures
// screenshots of every key screen, and fails on any console error.
// Run locally:  npm run build && npx playwright install chromium && node scripts/qa.mjs
// ────────────────────────────────────────────────────────────────
import { chromium, devices } from 'playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = resolve(root, 'docs/screenshots');
mkdirSync(shots, { recursive: true });

const server = await createServer({ root, server: { port: 5199 } });
await server.listen();
const url = 'http://localhost:5199/';

const errors = [];
async function run(label, device) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...device, permissions: [] });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/${label}-01-start.png` });

  // Read on screen → cover page alive
  await page.getByText(/Read on screen|画面で読む/).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${shots}/${label}-02-cover.png` });

  // jump to priority scenes via page dots
  for (const [i, name] of [[3, 'forest'], [4, 'witch'], [10, 'violet']]) {
    await page.locator('.dot').nth(i).click();
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${shots}/${label}-03-${name}.png` });
  }

  // Enter this world
  await page.getByText(/Enter this world/i).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Enter$|入る/ }).click().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${label}-04-enter-prompt.png` });
  await page.getByText(/Drag to look|ドラッグ/).click().catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${shots}/${label}-05-world.png` });

  await ctx.close();
  await browser.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', devices['iPhone 13']);

await server.close();

if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('QA passed — no console errors. Screenshots in docs/screenshots/');
