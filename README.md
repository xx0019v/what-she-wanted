# WHAT SHE WANTED — Enter the Story

**▶ Live:  https://xx0019v.github.io/what-she-wanted/**
**ISCA 2026 · Digital Content** — an interactive picture-book that lives beyond the printed page.

> The printed page shows what happened. The camera reveals what remained inside her.

A silent, dark-fantasy web experience in three layers:
- **PAGE ALIVE** — hold a phone to a printed page; the scene breathes with parallax, fog, fireflies, memory ribbons and light (all procedural — no added AI art).
- **THE FOREST LEAVES THE PAGE** — a 3-D moon lifts off the paper, branches overhang the edge, fog and fireflies spill into the room. Each of pages 4 / 5 / 11 / 17 has its own story-specific staging.
- **ENTER THE WORLD** — step through moonlight into a navigable 360° forest with gaze-activated story points.

Bilingual (EN/JP), silent by design, PWA-installable, camera-optional with graceful fallbacks.

---

## View it now (no install)
Open the live URL above. Handy deep-links:
- `/?view=world` — the immersive 360° forest
- `/?view=arfx&page=4` (or `5` · `11` · `17`) — **camera-free spatial preview** of each page's off-page AR
- `/?view=demo` — page-alive (atmosphere + floating subtitles)
- `/?view=ar&debug=1` — the real camera AR with the on-device diagnostics panel

## Test on iPhone with printed pages
1. Print the pages — files are served at **`/print/`** (or in `print/`):
   `AR_TEST_PRINT_GUIDE.pdf` (QR + how-to + record grid), and `page-04-forest-a4.pdf`,
   `page-05-witch-meeting-a4.pdf`, `page-11-violet-moon-a4.pdf`, `page-17-cycle-a4.pdf` (PDF + PNG).
2. Open the live URL in **Safari** → *Begin AR* → allow the camera → frame the whole page.
3. Add `?debug=1`, then **COPY LOG** and send it back. Full protocol: **`docs/REAL_DEVICE_TEST.md`**.

## Run locally
```bash
npm install
npm run dev            # http://localhost:5173  (camera works on localhost)
npm run build && npm run preview
```
Quality gates: `npm run typecheck` · `npm run lint` · `npm run test`

## Deploy
```bash
npm run deploy         # builds, force-pushes ./dist to the gh-pages branch
```
Published at https://xx0019v.github.io/what-she-wanted/ (Pages serves `gh-pages`; `main` is source).

## Tooling
```bash
python3 scripts/make-print-kit.py                 # 4-page A4 print kit + QR guide
node scripts/compile-targets.mjs <out> <a.rgba> …  # offline multi-target .mind compiler
```

## Tech
Vite · React 18 · TypeScript (strict) · Three.js (procedural off-page AR + 360° world) ·
Canvas 2D atmosphere · MindAR (image tracking, 4-page `pages.mind`) · hand-written PWA · Playwright QA.

## Structure
```
public/pages/     17 page images (.webp + .jpg)
public/targets/   pages.mind (p4/p5/p11/p17, indices 0-3)
public/print/     A4 print kit (served) + qr.png
src/ar/           anchorFX.ts (p4 depth) · pageFX.ts (p5/p11/p17) · forestAR.ts (MindAR)
src/three/        world.ts (360° forest)
src/fx/           atmosphere.ts (procedural canvas FX)
src/components/    StartScreen, PageStage, ARExperience, ARPreview, ImmersiveView, …
docs/             WORLD_CLASS_UPGRADE.md · REAL_DEVICE_TEST.md · design/QA notes
```

See **`docs/WORLD_CLASS_UPGRADE.md`** for what each layer does and **`docs/REAL_DEVICE_TEST.md`**
for the iPhone test + fix loop. On-device camera tracking (recognition speed, jitter, FPS) can
only be measured on a real phone; everything else is verified.
