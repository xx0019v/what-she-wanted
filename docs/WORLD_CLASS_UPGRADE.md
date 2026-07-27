# WORLD-CLASS UPGRADE — WHAT SHE WANTED

An upgrade pass turning the page-bound WebAR into a three-layer spatial work:
**printed page → forest that rises off the page → an immersive world you enter.**
Built on the existing React · Vite · TS · Three.js · MindAR stack — nothing was
rebuilt from scratch; the weak parts were lifted, the strong parts kept.

## What changed

### 1. The forest leaves the page (CRITICAL 01) — `src/ar/anchorFX.ts`
The page-04 AR was flat (everything sat on the paper). It now has true depth:
- a **shaded moon disc floats well in front** of the printed moon → real parallax
  as the viewer moves (head-on it overlays the printed moon; off-axis it lifts off);
- **foreground branches overhang the top edge** into real space;
- **ground fog exceeds the page width** and crosses the side/bottom edges;
- **fireflies range beyond the page rectangle**;
- the girl gets a cool aura + a **forward-cast shadow onto the table**;
- a **hidden violet witch-presence** tides in and out.
Nothing opaque covers the printed text (all additive / off-page).

### 2. The immersive world, rebuilt (CRITICAL 02) — `src/three/world.ts`
From a dark, dead ring to a composed nightscape:
- the **moon is a clear luminous landmark** (soft textured disc, restrained glow,
  a blue↔violet "memory" breath), framed by a clearing cut through the trees;
- **living ground** — moonlit path/reflection, low fog, ground embers, footprints —
  no dead-black wells;
- **girl (white) and witch (violet)** stand in the world as 2.5-D silhouettes;
- a **violet memory ribbon** flows from the moon toward the path;
- **INSTANCED**, non-uniform forest (varied height/density) with framing branches;
- blue→violet sky gradient, clustered stars.

### 3. Per-page spatial FX (CRITICAL 03) — `src/ar/pageFX.ts`
Each page has its own staging (no reused effects):
- **p5 — the space between them holds the promise**: blue motes from the girl,
  violet from the witch, converging at centre without fully merging; light climbs
  the staff; a soft violet bloom holds the space. No magic circle.
- **p11 — the moon remembers**: the floating moon turns blue→violet over ~5 s,
  memory rings form, a violet wash seeps outward, then **holds still**, then eases
  back — a slow breathing cycle. The symbolic centre.
- **p17 — she became the one who was waiting**: the moon returns to the cover's
  blue; the watcher's violet aura swells slowly (the quiet reveal) while the
  opening fog drifts again; never resolves to black.

### 4. Multi-page AR targets — `scripts/compile-targets.mjs`, `public/targets/pages.mind`
`pages.mind` is compiled **offline** from pages [4, 5, 11, 17] (tracking indices
0–3). `forestAR.ts` builds one anchor per page; whichever printed page is in view
shows its own FX (`maxTrack: 1`).

Regenerate / extend:
```bash
# 1) decode pages to raw 1024×576 RGBA (PIL)
python3 - <<'PY'
from PIL import Image
for n in (4,5,11,17):
    Image.open(f'public/pages/{n}.jpg').convert('RGB').resize((1024,576)).convert('RGBA').tobytes()  # → /tmp/p{n}.rgba (write it)
PY
# 2) compile (order = tracking index)
node scripts/compile-targets.mjs public/targets/pages.mind /tmp/p4.rgba /tmp/p5.rgba /tmp/p11.rgba /tmp/p17.rgba
```

### 5. Floating subtitles (CRITICAL 04) — `src/styles.css`
The translucent card is gone. Subtitles float in space with a soft, edge-feathered
darkening behind the glyphs only (cinema caption ↔ gallery wall-text).

### 6. Continuous page→world entry — `src/components/ImmersiveView.tsx`
A moonlight/fog bloom fills the frame then opens onto the forest, so arriving
reads as passing through light — and it masks the world's first warm-up frames.

## Verify it yourself (QA deep-links)
The dev/QA server accepts `?view=` to jump straight to a layer:
- `?view=world` — the immersive forest
- `?view=arfx&page=4|5|11|17` — **camera-free spatial preview** of each page's
  off-page AR (page on a surface, slow orbit reveals the depth)
- `?view=demo` — page-alive (atmosphere + floating subtitles)
- `?view=ar` — the real camera AR (needs camera + printed page)

## Quality gates (all green)
`npm run lint` · `npm run typecheck` · `npm run test` (5/5) · `npm run build` —
no console errors; checked at desktop and mobile (375×812) viewports.

## Honestly remaining
- **On-device camera tracking** of the multi-page target (p5/p11/p17) can't be
  verified in this build environment — it needs a phone + the printed pages. The
  page-alive spatial FX are verified via `?view=arfx&page=N`; the target file and
  wiring are in place, so this is a device-test step, not new code.
- The page→world transition is a **light/fog-masked** continuous entry; a full
  page-side choreography (moon rises, branches part, camera passes *through* the
  page) is a further enhancement.
- Deploy: `dist/` is built and ready. Publishing to the public GitHub Pages URL
  (`npm run deploy`) is left as an explicit step (outward-facing).
