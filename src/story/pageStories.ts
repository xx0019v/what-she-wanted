// ────────────────────────────────────────────────────────────────
// The four page stories. Each is a TIMELINE, not a loop: phases fire in order
// from the moment the printed page is recognised, every phase states what it
// means in this page's story, and the subtitles cue with the beats.
//
// Phase shape follows the brief's timings. `sustain: false` marks a passing
// moment (it rises then recedes) — used for things the story shows once.
// ────────────────────────────────────────────────────────────────
import { createForestScene, createContractScene, createVioletMoonScene, createCycleScene } from './scenes';
import type { PageStory } from './storyTypes';

export const PAGE_STORIES: PageStory[] = [
  // ═══════════════════════════════════════════════════════════
  {
    pageNumber: 4,
    targetIndex: 0,
    title: 'Into the Forest',
    narrativeRole: 'She walks, alone and afraid, into the forest no one enters.',
    theme: 'THE FOREST AWAKENS AROUND HER.',
    duration: 12,
    restartPolicy: 'resume',
    resumeWindow: 6,
    phases: [
      // 0.0–1.0 the page is just paper: no phase, deliberate stillness
      { id: 'moon-breath', start: 1.0, duration: 1.5, channel: 'moonBreath', meaning: 'Moonlight begins to breathe — the world notices her.' },
      { id: 'ground-mist', start: 2.0, duration: 2.0, channel: 'groundMist', meaning: 'Low mist gathers at her feet: the forest floor waking.' },
      { id: 'fireflies', start: 3.0, duration: 2.5, channel: 'fireflies', meaning: 'Fireflies drift ahead of her — the way forward, offered.' },
      { id: 'depth', start: 4.0, duration: 3.0, channel: 'depth', meaning: 'Mid and far trees rise: the forest gains real depth around her.' },
      { id: 'branches', start: 5.5, duration: 2.5, channel: 'branches', meaning: 'Foreground branches lean past the paper into the room.' },
      { id: 'overflow', start: 6.5, duration: 3.0, channel: 'overflow', meaning: 'Mist and fireflies cross the page edge — the forest is no longer contained.' },
      { id: 'witch-hint', start: 8.0, duration: 1.6, channel: 'witchHint', sustain: false, meaning: 'A violet presence, once, far off: someone is already waiting.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.2, en: 'She entered the forest no one dared to enter.', jp: '誰も足を踏み入れない森へ、彼女は入っていった。', anchor: 'lower-left' },
      { at: 8.4, hold: 3.0, en: 'Something was already waiting.', jp: '何かが、すでに待っていた。', anchor: 'lower-left' },
    ],
    createScene: createForestScene,
  },

  // ═══════════════════════════════════════════════════════════
  {
    pageNumber: 5,
    targetIndex: 1,
    title: 'First Meeting',
    narrativeRole: 'She asks the witch to erase every painful memory.',
    theme: 'THE SPACE BETWEEN THEM BECOMES A PROMISE.',
    duration: 12,
    restartPolicy: 'resume',
    resumeWindow: 6,
    phases: [
      { id: 'hush', start: 0.0, duration: 1.5, channel: 'hush', meaning: 'The held breath between a child and something ancient.' },
      { id: 'blue-side', start: 1.5, duration: 2.0, channel: 'blueSide', meaning: 'Her side answers first: a small, cool light — the wish.' },
      { id: 'violet-side', start: 2.5, duration: 2.0, channel: 'violetSide', meaning: 'The witch answers in violet: older, taller, patient.' },
      { id: 'memory-gather', start: 3.5, duration: 3.0, channel: 'memoryGather', meaning: 'Memories drift from both toward the space between: the bargain forming.' },
      { id: 'staff-light', start: 5.5, duration: 2.5, channel: 'staffLight', meaning: 'A thin light climbs the staff — the spell accepting the terms.' },
      { id: 'tension', start: 7.0, duration: 3.0, channel: 'tension', meaning: 'Blue and violet meet but never merge: a contract, not a union.' },
    ],
    subtitles: [
      { at: 1.8, hold: 4.4, en: '“Erase every bad memory from my mind.”', jp: '「悪い記憶を、すべて消して。」', anchor: 'lower-left' },
      { at: 7.2, hold: 3.6, en: 'In return, she offered anything.', jp: 'その代わりに、彼女は何でも差し出した。', anchor: 'lower-left' },
    ],
    createScene: createContractScene,
  },

  // ═══════════════════════════════════════════════════════════
  {
    pageNumber: 11,
    targetIndex: 2,
    title: 'Violet Moon',
    narrativeRole: 'The witch speaks, and the moon takes on the colour of memory.',
    theme: 'THE MOON REMEMBERS WHAT SHE FORGOT.',
    duration: 14,
    restartPolicy: 'restart',
    resumeWindow: 3,
    phases: [
      { id: 'blue-moon', start: 0.0, duration: 2.0, channel: 'blueMoon', meaning: 'The moon as it was: blue, and telling her nothing.' },
      { id: 'violet-seep', start: 2.0, duration: 4.0, channel: 'violetSeep', meaning: 'Memory soaks into the moon from within — never a flash.' },
      { id: 'propagate', start: 4.0, duration: 3.0, channel: 'propagate', meaning: 'The violet spreads to mist, trees, figures: everything remembers with it.' },
      { id: 'memory-rings', start: 6.0, duration: 3.0, channel: 'memoryRings', meaning: 'Rings form around the moon: the layers of what she gave away.' },
      { id: 'stillness', start: 9.0, duration: 2.0, channel: 'stillness', meaning: 'Everything slows almost to rest. The image is allowed to be looked at.' },
    ],
    subtitles: [
      { at: 2.4, hold: 4.0, en: 'The moon slowly began to turn violet.', jp: '月は、ゆっくりと紫に染まっていった。', anchor: 'bottom' },
      { at: 9.4, hold: 4.0, en: 'Memory has a colour. She had simply stopped seeing it.', jp: '記憶には色がある。彼女はただ、見なくなっていた。', anchor: 'bottom' },
    ],
    createScene: createVioletMoonScene,
  },

  // ═══════════════════════════════════════════════════════════
  {
    pageNumber: 17,
    targetIndex: 3,
    title: 'The Cycle',
    narrativeRole: 'The girl walks on — and the one left behind is the new witch.',
    theme: 'SHE BECAME THE ONE WHO WAS WAITING.',
    duration: 14,
    restartPolicy: 'restart',
    resumeWindow: 3,
    phases: [
      { id: 'departure', start: 0.0, duration: 3.0, channel: 'departure', meaning: 'Read as a farewell: she is walking away, free.' },
      { id: 'moon-returns', start: 3.0, duration: 3.0, channel: 'moonReturns', meaning: 'The moon returns to the cover’s blue: we are back at the beginning.' },
      { id: 'watcher-violet', start: 5.0, duration: 3.0, channel: 'watcherViolet', meaning: 'Violet gathers around the one who stayed — the quiet reveal.' },
      { id: 'opening-mist', start: 7.0, duration: 3.0, channel: 'openingMist', meaning: 'The first page’s mist drifts again: the loop has closed.' },
      { id: 'continuation', start: 10.0, duration: 3.0, channel: 'continuation', meaning: 'A thread reaches outward. The story does not end — it waits.' },
    ],
    subtitles: [
      { at: 0.8, hold: 3.4, en: 'She walked on, toward her own dream.', jp: '彼女は自分の夢へと歩き出した。', anchor: 'upper-left' },
      { at: 5.4, hold: 4.2, en: 'But no one noticed who had stayed behind.', jp: 'けれど、誰も気づかなかった——残った者が誰なのかを。', anchor: 'upper-left' },
      { at: 10.2, hold: 3.6, en: 'The witch was waiting to grant someone else’s wish.', jp: '魔女は、次の誰かの願いを待っていた。', anchor: 'upper-left' },
    ],
    createScene: createCycleScene,
  },
];

export const storyForPage = (page: number): PageStory | undefined =>
  PAGE_STORIES.find((s) => s.pageNumber === page);

export const storyForTargetIndex = (index: number): PageStory | undefined =>
  PAGE_STORIES.find((s) => s.targetIndex === index);

/** Pages in target-index order — matches the compiled pages.mind. */
export const AR_PAGE_ORDER = PAGE_STORIES.slice()
  .sort((a, b) => a.targetIndex - b.targetIndex)
  .map((s) => s.pageNumber);
