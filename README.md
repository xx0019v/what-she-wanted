# WHAT SHE WANTED — Enter the Story
**ISCA 2026 · Digital Content** — an interactive picture-book that lives beyond the printed page.

> The printed page shows what happened. The camera reveals what remained inside her.

A silent, dark-fantasy web experience in two layers:
- **PAGE ALIVE** — point a phone at a printed page; the scene breathes with 2.5D parallax, fog, fireflies, memory ribbons and light (all procedural — no added AI art).
- **ENTER THE WORLD** — step into a navigable 360° moonlit forest built in Three.js, with gaze-activated story points.

Bilingual (EN/JP), fully silent by design, PWA-installable, camera-optional with graceful fallbacks.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (camera works on localhost)
```

Production build + preview:
```bash
npm run build
npm run preview          # http://localhost:4173
npm run preview:https    # TLS, for phone testing over LAN
```

Quality gates:
```bash
npm run typecheck   # tsc, no errors
npm run lint        # eslint, clean
npm run test        # vitest (story-data integrity)
```

## 📷 Test on a phone with printed pages
See **`docs/CAMERA_TEST_TODAY.md`** — print `docs/print-targets-A4.pdf`, compile
`targets.mind` (1-min web tool), open over HTTPS (Netlify Drop is the easiest path).

## Tooling scripts
```bash
node scripts/make-icons.mjs         # procedural moon PWA icons
python3 scripts/make-assets.py      # WebP derivatives + representative stills
node scripts/qa.mjs                 # Playwright browser QA + screenshots (needs: npx playwright install chromium)
node scripts/capture-video.mjs      # records the live-app jury video (≤3 min)
bash scripts/build-concept-video.sh # offline concept-preview MP4 from page art
```

## Tech
Vite · React 18 · TypeScript (strict) · Three.js (procedural 360° world) · Canvas 2D
atmosphere engine · GSAP-ready timing · MindAR (CDN, image tracking) · hand-written
PWA (manifest + service worker) · Playwright QA.

## Structure
```
public/pages/        17 page images (.webp derivatives + .jpg originals)
public/targets/      drop targets.mind here (see README inside)
src/data/            scenes.ts (story + EN/JP subtitles), worldPoints.ts
src/fx/              atmosphere.ts (procedural canvas FX)
src/three/           world.ts (360° forest)
src/components/      StartScreen, PageStage, EnterPrompt, ImmersiveView, CameraScanner, ...
docs/                design docs, QA, print PDF, camera runbook, video
scripts/             asset/icon/video/QA automation
```

Camera recognition requires a compiled `targets.mind` (not committed — generate in ~1 min).
Without it, the app runs fully via manual page selection.
