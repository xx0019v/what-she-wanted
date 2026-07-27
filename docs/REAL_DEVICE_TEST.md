# REAL-DEVICE AR TEST — WHAT SHE WANTED

**Live URL:** https://xx0019v.github.io/what-she-wanted/
**Debug:** https://xx0019v.github.io/what-she-wanted/?view=ar&debug=1
(the debug panel also appears over any camera error, so you can COPY LOG regardless)

Deployed to GitHub Pages (`gh-pages` branch, force-push). `main` is untouched.
Re-deploy any time with `npm run deploy`.

## Print the pages
Served on the site (or in `print/`):
- `/print/AR_TEST_PRINT_GUIDE.pdf` — one-sheet guide (QR + how-to + record grid)
- `/print/page-04-forest-a4.pdf` · `/print/page-05-witch-meeting-a4.pdf`
- `/print/page-11-violet-moon-a4.pdf` · `/print/page-17-cycle-a4.pdf`
- (PNG versions alongside each; `/print/qr.png`)

Matte / plain paper, printed large and flat. Avoid glossy (reflections hurt tracking).

## Test flow (iPhone Safari)
1. Open the URL in **Safari** (not an in-app browser).
2. **Begin AR** → allow the camera.
3. Frame the **whole** printed page, ~30–60 cm, in even light.
4. Each page shows its own scene:
   - **p4** forest: 3-D moon lifts off the page, branches overhang, fog/fireflies spill past the edge
   - **p5** the contract space between girl and witch
   - **p11** the moon turns blue→violet, then holds
   - **p17** the cycle — the watcher's violet swells
5. Add `?debug=1` and read STATUS / DETECTED PAGE / FIRST FOUND / FOUND-LOST / FPS.
6. Tap **COPY LOG** and paste it back with the grid below.

## Targets (goals, to confirm on device)
first-found ≤ 2 s · works 30–60 cm · stable ≥ 10 s front-on · follows ~15–20° tilt ·
re-acquire ≤ 1.5 s · no violent jitter · overlay stays on the page · correct page id ·
the 3-D moon does not read as an ugly double of the printed moon · branches/fog read
off the page · all four pages show their own scene · Safari resume re-starts the camera.

## Result template — paste this back
```
# REAL IPHONE AR TEST
URL / BUILD:
Device / iOS / Safari:

## PAGE 04  first-found: | distance: | front: | tilt: | jitter: | re-acquire: | 3D moon: | branches: | fog: | ERROR:
## PAGE 05  first-found: | distance: | front: | tilt: | jitter: | re-acquire: | scene: | ERROR:
## PAGE 11  first-found: | distance: | front: | tilt: | jitter: | re-acquire: | moon colour: | ERROR:
## PAGE 17  first-found: | distance: | front: | tilt: | jitter: | re-acquire: | cycle: | ERROR:

screen recording:
DEBUG LOG (COPY LOG):
```

## Fix loop (once results come back)
- **won't recognise** → check target index/scale, print size, lighting/reflections, `pages.mind` 200
- **slow** → `warmupTolerance` / `missTolerance` / target preprocessing / preload
- **jitter** → `filterMinCF` / `filterBeta` (One-Euro) in `src/ar/forestAR.ts`, reduce large transparent planes
- **heavy** → reduce in this order: particle count → DPR → shadow → shader → texture → post → geometry
  (never delete the story-critical moon / branches / fog)
Then: fix → `npm run build` → `npm run deploy` → re-test.

## Not verifiable in the build environment (needs your phone)
On-device camera recognition, tracking stability, jitter, re-acquire timing, and FPS
can only be measured on a real iPhone with the printed pages. Everything up to that —
build, targets, asset serving over HTTPS (all 200), the per-page spatial FX
(`?view=arfx&page=N`), the diagnostics — is verified.
