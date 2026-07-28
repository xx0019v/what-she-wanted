# PAGE-SPECIFIC AR STORY RUNTIME

Recognising a printed page **starts that page's story on the paper**. It is not a
page-flavoured loop — it is a timeline that begins at recognition, advances in
ordered phases, cues its own subtitles, holds when the page leaves view, and
resumes or restarts when it returns.

**Live:** https://xx0019v.github.io/what-she-wanted/
**Story harness:** `?view=storytest&page=N` — every page 1–17

---

## What was missing before
The previous per-page effects were **self-looping**: every element animated from a
global `t` (sine loops), so
- the "story" was already mid-motion the instant the page was seen,
- there was no stabilise beat, no ordering, no ending,
- `TARGET LOST` snapped the visuals off and nothing was held,
- re-acquiring had no resume/restart policy,
- **all four pages' effects updated every frame** (no dispose on switch),
- and AR showed **no subtitles at all**, so the narrative could not be read.

## The runtime
`src/story/storyRuntime.ts` — one story mounted at a time.

```
SEARCHING → (target found) → STABILIZING (0.35 s steady)
          → AWAKENING (the page is still; nothing moves yet)
          → PLAYING (phases fire in order from the local clock)
          → COMPLETE (rests at its final image)
          → PAUSED (page left view: timeline held, visuals fade over ~0.45 s grace)
```

- **Local clock.** Time starts at recognition. Nothing references a global sine.
- **Phases → channels.** Each `StoryPhase` eases one named channel 0→1 across
  `[start, start+duration]`. A scene's element is only present when its channel is
  up, so a beat that has not happened is genuinely absent. `sustain: false` marks a
  passing moment that rises then recedes (e.g. p4's single witch hint).
- **Subtitle cues** fire from the same clock and are positioned per cue so they sit
  in the page's negative space, never over the printed art. No card, no panel —
  only the words with a feathered shadow (`.story-line`).
- **Lost / re-acquire.** Losing the page holds `elapsed` and fades out; returning
  within `resumeWindow` **resumes** (p4, p5) or **restarts** (p11, p17) per
  `restartPolicy`.
- **Page switch** disposes the previous scene (textures, geometries, materials)
  before mounting the new one, so two stories can never animate at once.
- Reduced motion holds everything at settled levels.

## The four stories

All 17 pages have a story; the target index equals `page - 1`.

| page | theme |
|---|---|
| 1 Cover | THE STORY IS ALREADY WAITING |
| 2 Nightmare | THE DARK IS STILL IN THE ROOM |
| 3 The Door | THE FOREST IS ALREADY BREATHING THROUGH THE DOOR |
| 4 Into the Forest | THE FOREST AWAKENS AROUND HER |
| 5 First Meeting | THE SPACE BETWEEN THEM BECOMES A PROMISE |
| 6 The Promise | A CHILD PROMISES SOMETHING SHE CANNOT MEASURE |
| 7 The Witch Vanishes | THE BARGAIN IS KEPT. SHE IS ALONE |
| 8 Emptiness | NOTHING CAME TO FILL THE SPACE |
| 9 Second Meeting | THE ONE SHE PAID IS BACK |
| 10 The Question | THE QUESTION HANGS IN THE GAP BETWEEN THEM |
| 11 Violet Moon | THE MOON REMEMBERS WHAT SHE FORGOT |
| 12 Memories | EVERYTHING SHE ERASED IS STANDING AROUND HER |
| 13 Strength | WHAT SHE THREW AWAY WAS HER STRENGTH |
| 14 Overcome | THE ONLY WAY THROUGH IS THROUGH |
| 15 Release | GRATITUDE IS WHAT BREAKS IT |
| 16 Her Own Dream | SHE IS THE LIGHT NOW |
| 17 The Cycle | SHE BECAME THE ONE WHO WAS WAITING |

Every phase carries a `meaning` string in `pageStories.ts` — the story reason it
exists. Motion without a reason was removed.

## Files
```
src/story/sceneKit.ts      the procedural object library (moon, tree fields, canopy,
                           mist, fireflies, motes, spark streams, ribbons, auras,
                           figures, crowds, light threads, rings, washes, shadows,
                           stars, tendrils) — all phase-driven
src/story/storyTypes.ts    state machine, PageStory / StoryPhase / SubtitleCue, ARPage
src/story/storyRuntime.ts  the engine (mount, phases, cues, lost/resume, dispose)
src/story/scenes.ts        17 distinct stages composed from the kit
src/story/pageStories.ts   17 timelines + EN/JP subtitle cues
src/components/StorySubtitle.tsx  the floating story line
src/components/StoryTest.tsx      ?view=storytest harness
src/ar/forestAR.ts         MindAR recognition → runtime (one anchor per page)
```
The old self-looping `src/ar/pageFX.ts` and `src/ar/anchorFX.ts` were deleted;
`?view=arfx` now runs on the same runtime, so there is a single source of truth.

## Targets
`public/targets/pages.mind` is compiled from **all 17 pages** (indices 0–16, 8.1 MB)
by `scripts/compile-targets.mjs`. It is fetched only when AR starts and is not
pre-cached by the service worker, so the landing page load is unaffected.

## Verified in-browser (desktop + mobile 375×812)
- page N → index N-1 (spot-checked p2/p12/p13/p16 live; correct page every time)
- phases advance in order; `CURRENT PHASE` / `ELAPSED` track the timeline
- subtitle cues appear on time and leave (`@2.6s`, `@8.4s`, …)
- `SIM LOST` → `PAUSED`, elapsed **held**, visuals fade, subtitle clears
- `SIM REACQUIRE` on p11 → restarts from 0 (its policy); p4/p5 resume
- `NEXT PAGE` → previous story gone, new story from 0, counters reset
- lint · typecheck · test (5/5) · build all pass; no console errors
  (fixed: keyed the WebGL canvases so a page/quality change gets a fresh element)

## Only measurable on a real iPhone
Recognition speed, tracking stability/jitter, whether the 0.35 s stabilise feels
right in the hand, re-acquire timing with a real camera, and on-device FPS.
Print `/print/` pages, open the live URL in Safari, add `?debug=1` (it now shows
STORY STATE / PHASE / ELAPSED) and send the COPY LOG back.
