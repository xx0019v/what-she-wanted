// ────────────────────────────────────────────────────────────────
// Page-specific story types.
//
// A printed page is not a marker — it is an entrance. Recognising it starts a
// TIMED story on the paper: phases fire in order from a local clock that begins
// at recognition (never a global sine loop), subtitles cue with the beats, and
// the whole thing pauses / resumes / restarts as the page leaves and returns.
// ────────────────────────────────────────────────────────────────
import type * as THREE from 'three';

/** Every printed page now has a story and a compiled target. */
export type ARPage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

/** Where the runtime is in the recognition → story lifecycle. */
export type StoryState =
  | 'idle'          // nothing recognised
  | 'stabilizing'   // target seen, waiting for it to hold steady
  | 'awakening'     // the page is still; light/mist barely stirs
  | 'playing'       // the story is running its phases
  | 'complete'      // the story reached its end and rests there
  | 'paused';       // the page left view; timeline held, visuals fading

/** What happens when a page comes back after being lost. */
export type RestartPolicy = 'restart' | 'resume';

/**
 * A scene is the page's procedural stage. It exposes named channels that
 * phases drive — the scene itself never animates on a global clock.
 *
 * `apply` receives the story-local elapsed time and the per-channel levels the
 * phases have set, so all motion is a function of narrative time.
 */
export interface StoryScene {
  /** Root group parented to the tracked anchor (or a preview group). */
  group: THREE.Group;
  /** Drive the scene for this frame. `levels` are 0..1 phase intensities. */
  apply: (elapsed: number, dt: number, levels: Readonly<Record<string, number>>, master: number) => void;
  dispose: () => void;
}

export interface StoryPhase {
  id: string;
  /** Seconds from story start. */
  start: number;
  /** Seconds this phase takes to reach full level. */
  duration: number;
  /**
   * Channel this phase drives. The runtime eases 0→1 across [start, start+duration]
   * and holds at 1 afterwards (unless `sustain` is false).
   */
  channel: string;
  /** If false the channel eases back to 0 after `duration` (a passing moment). */
  sustain?: boolean;
  /** Why this exists in the story — every motion must justify itself. */
  meaning: string;
}

export interface SubtitleCue {
  /** Seconds from story start. */
  at: number;
  /** Seconds visible. */
  hold: number;
  en: string;
  jp: string;
  /** Where it sits so it never covers the printed art. */
  anchor: 'top' | 'bottom' | 'lower-left' | 'upper-left';
}

export interface PageStory {
  pageNumber: number;
  /** Index inside the compiled pages.mind (0-based). */
  targetIndex: number;
  title: string;
  /** One line: this page's job in the whole fable. */
  narrativeRole: string;
  /** Theme line shown nowhere — it disciplines the staging. */
  theme: string;
  /** Total story length in seconds (after which it rests in `complete`). */
  duration: number;
  restartPolicy: RestartPolicy;
  /** If a page is lost and returns within this many seconds, resume. */
  resumeWindow: number;
  phases: StoryPhase[];
  subtitles: SubtitleCue[];
  createScene: (opts: { quality: 'high' | 'low' }) => StoryScene;
}

/** Live snapshot the UI/diagnostics read. */
export interface StoryStatus {
  page: number | null;
  targetIndex: number | null;
  state: StoryState;
  phase: string | null;
  elapsed: number;
  duration: number;
  subtitle: SubtitleCue | null;
  foundCount: number;
  lostCount: number;
  reacquireCount: number;
}
