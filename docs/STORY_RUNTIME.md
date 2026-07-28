# PAGE-SPECIFIC AR STORY RUNTIME

Recognising a printed page **starts that page's story on the paper**. It is not a
page-flavoured loop — it is a timeline that begins at recognition, advances in
ordered phases, cues its own subtitles, holds when the page leaves view, and
resumes or restarts when it returns.

**Live:** https://xx0019v.github.io/what-she-wanted/
**Story harness:** `?view=storytest&page=4` (also `5`, `11`, `17`)

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

| page | index | theme | phases |
|---|---|---|---|
| **p4** Into the Forest | 0 | THE FOREST AWAKENS AROUND HER | still → moon-breath 1.0 → ground-mist 2.0 → fireflies 3.0 → depth 4.0 → branches 5.5 → overflow 6.5 → witch-hint 8.0 (once) |
| **p5** First Meeting | 1 | THE SPACE BETWEEN THEM BECOMES A PROMISE | hush 0.0 → blue-side 1.5 → violet-side 2.5 → memory-gather 3.5 → staff-light 5.5 → tension 7.0 |
| **p11** Violet Moon | 2 | THE MOON REMEMBERS WHAT SHE FORGOT | blue-moon 0.0 → violet-seep 2.0 → propagate 4.0 → memory-rings 6.0 → **stillness 9.0** |
| **p17** The Cycle | 3 | SHE BECAME THE ONE WHO WAS WAITING | departure 0.0 → moon-returns 3.0 → watcher-violet 5.0 → opening-mist 7.0 → continuation 10.0 |

Every phase carries a `meaning` string in `pageStories.ts` — the story reason it
exists. Motion without a reason was removed.

## Files
```
src/story/storyTypes.ts    state machine, PageStory / StoryPhase / SubtitleCue, ARPage
src/story/storyRuntime.ts  the engine (mount, phases, cues, lost/resume, dispose)
src/story/scenes.ts        the four phase-driven procedural stages
src/story/pageStories.ts   the four timelines + subtitle cues
src/components/StorySubtitle.tsx  the floating story line
src/components/StoryTest.tsx      ?view=storytest harness
src/ar/forestAR.ts         MindAR recognition → runtime (one anchor per page)
```
The old self-looping `src/ar/pageFX.ts` and `src/ar/anchorFX.ts` were deleted;
`?view=arfx` now runs on the same runtime, so there is a single source of truth.

## Verified in-browser (desktop + mobile 375×812)
- p4 → index 0, p5 → index 1, p11 → index 2, p17 → index 3 (correct page every time)
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
