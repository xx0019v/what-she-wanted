// ────────────────────────────────────────────────────────────────
// Story runtime — recognition → timed narrative on the paper.
//
// One page's story runs at a time. The clock starts when the target has held
// steady (not on the first flicker), phases fire in order from that local time,
// subtitles cue with the beats, and losing the page pauses rather than snaps:
// visuals fade over a grace period, the timeline is held, and returning either
// resumes (short absence) or restarts (long absence) per the page's policy.
// Switching pages disposes the previous scene so two stories never overlap.
// ────────────────────────────────────────────────────────────────
import type { PageStory, StoryScene, StoryState, StoryStatus, SubtitleCue } from './storyTypes';

export interface StoryRuntimeOptions {
  quality: 'high' | 'low';
  reducedMotion: boolean;
  /** Seconds the target must hold before the story begins. */
  stabilizeTime?: number;
  /** Seconds the visuals keep living after the page leaves view. */
  graceTime?: number;
  onStatus?: (s: StoryStatus) => void;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

export class StoryRuntime {
  private story: PageStory | null = null;
  private scene: StoryScene | null = null;
  private state: StoryState = 'idle';
  private elapsed = 0;
  /**
   * A second clock that drives the scenes' breathing. It runs slower while the
   * reserved `stillness` channel is up, so a story can genuinely hold its breath
   * without rewinding the timeline that phases are measured against.
   */
  private motionTime = 0;
  /** Seconds the target has been continuously seen while stabilizing. */
  private steady = 0;
  /** Seconds since the page left view (drives the grace fade). */
  private absent = 0;
  private visible = 0;           // master opacity 0..1 (fades in/out)
  private levels: Record<string, number> = {};
  private currentPhase: string | null = null;
  private subtitle: SubtitleCue | null = null;
  private targetSeen = false;

  private foundCount = 0;
  private lostCount = 0;
  private reacquireCount = 0;
  /** How far the story had played when tracking was lost (for resume). */
  private lastElapsed = 0;

  constructor(private opts: StoryRuntimeOptions) {}

  private get stabilizeTime() { return this.opts.stabilizeTime ?? 0.35; }
  private get graceTime() { return this.opts.graceTime ?? 0.45; }

  get currentPage(): number | null { return this.story?.pageNumber ?? null; }
  get currentState(): StoryState { return this.state; }

  status(): StoryStatus {
    return {
      page: this.story?.pageNumber ?? null,
      targetIndex: this.story?.targetIndex ?? null,
      state: this.state,
      phase: this.currentPhase,
      elapsed: this.elapsed,
      duration: this.story?.duration ?? 0,
      subtitle: this.subtitle,
      foundCount: this.foundCount,
      lostCount: this.lostCount,
      reacquireCount: this.reacquireCount,
    };
  }

  /**
   * The tracker found this page. Mounts its scene (disposing any previous page's)
   * and enters `stabilizing` — the story does not start on a single flicker.
   */
  targetFound(story: PageStory) {
    this.foundCount += 1;
    this.targetSeen = true;

    const samePage = this.story?.pageNumber === story.pageNumber;
    if (!samePage) {
      // A different page: end the old story cleanly, start this one fresh.
      this.disposeScene();
      this.story = story;
      this.scene = story.createScene({ quality: this.opts.quality });
      this.elapsed = 0;
      this.levels = {};
      this.currentPhase = null;
      this.subtitle = null;
      this.visible = 0;
    } else {
      // Same page returning: resume or restart per policy + absence length.
      this.reacquireCount += 1;
      const withinWindow = this.absent <= story.resumeWindow;
      if (story.restartPolicy === 'resume' && withinWindow) {
        this.elapsed = this.lastElapsed;
      } else {
        this.elapsed = 0;
        this.levels = {};
        this.currentPhase = null;
        this.subtitle = null;
      }
      if (!this.scene) this.scene = story.createScene({ quality: this.opts.quality });
    }

    this.absent = 0;
    this.steady = 0;
    this.state = this.elapsed > 0 ? 'playing' : 'stabilizing';
    this.emit();
  }

  /** The tracker lost the page. Hold the timeline; fade over the grace period. */
  targetLost() {
    if (!this.targetSeen) return;
    this.targetSeen = false;
    this.lostCount += 1;
    this.lastElapsed = this.elapsed;
    if (this.state !== 'idle') this.state = 'paused';
    this.emit();
  }

  /** Force a restart of the current page's story (diagnostics / retry). */
  restart() {
    if (!this.story) return;
    this.elapsed = 0;
    this.levels = {};
    this.currentPhase = null;
    this.subtitle = null;
    this.state = this.targetSeen ? 'stabilizing' : 'paused';
    this.steady = 0;
    this.emit();
  }

  /** Mount a story without a tracker (preview / storytest). */
  mount(story: PageStory, autoplay = true) {
    this.disposeScene();
    this.story = story;
    this.scene = story.createScene({ quality: this.opts.quality });
    this.elapsed = 0;
    this.levels = {};
    this.currentPhase = null;
    this.subtitle = null;
    this.visible = autoplay ? 1 : 0;
    this.targetSeen = autoplay;
    this.state = autoplay ? 'playing' : 'idle';
    this.emit();
  }

  setPaused(paused: boolean) {
    if (!this.story) return;
    if (paused) {
      this.targetSeen = false;
      this.state = 'paused';
    } else {
      this.targetSeen = true;
      this.absent = 0;
      this.state = this.elapsed > 0 ? 'playing' : 'stabilizing';
    }
    this.emit();
  }

  get sceneGroup() { return this.scene?.group ?? null; }

  /** Advance the story. Call every frame with real dt (seconds). */
  update(dt: number) {
    if (!this.story || !this.scene) return;
    const story = this.story;
    // Clamp only against pathological stalls; a throttled host still advances
    // narrative time at roughly real speed.
    const step = Math.min(dt, 0.25);

    if (this.targetSeen) {
      this.absent = 0;
      // ease the world in
      this.visible = Math.min(1, this.visible + step / 0.5);

      if (this.state === 'stabilizing') {
        this.steady += step;
        if (this.steady >= this.stabilizeTime) {
          // A beat of stillness before anything moves: the page is just paper.
          this.state = 'awakening';
        }
      } else if (this.state === 'awakening') {
        this.elapsed += step;
        // awakening covers the story's own opening stillness; hand over as soon
        // as the first phase is due
        const firstStart = story.phases.length ? story.phases[0].start : 0;
        if (this.elapsed >= firstStart) this.state = 'playing';
      } else if (this.state === 'playing') {
        this.elapsed += step;
        if (this.elapsed >= story.duration) {
          this.elapsed = story.duration;
          this.state = 'complete';
        }
      }
      // 'complete' rests: no further advance, visuals keep breathing at final levels
    } else {
      // Page is away — hold the timeline, fade the world out over the grace period.
      this.absent += step;
      const over = Math.max(0, this.absent - this.graceTime);
      this.visible = Math.max(0, 1 - over / 0.4);
      if (this.visible <= 0 && this.state !== 'idle') {
        // fully gone: keep the scene mounted (cheap) but stop the story
        this.state = 'paused';
      }
    }

    // ── phase → channel levels ─────────────────────────────────
    let active: string | null = null;
    for (const ph of story.phases) {
      const local = this.elapsed - ph.start;
      let level: number;
      if (local <= 0) {
        level = 0;
      } else if (local < ph.duration) {
        level = smooth(local / ph.duration);
        active = ph.id; // the newest phase still ramping is "current"
      } else {
        level = ph.sustain === false ? Math.max(0, 1 - smooth((local - ph.duration) / ph.duration)) : 1;
      }
      this.levels[ph.channel] = level;
    }
    if (active) this.currentPhase = active;
    else {
      // between ramps: report the last phase whose start has passed
      const passed = story.phases.filter((p) => this.elapsed >= p.start);
      this.currentPhase = passed.length ? passed[passed.length - 1].id : null;
    }

    // ── subtitle cue ───────────────────────────────────────────
    const cue = story.subtitles.find((s) => this.elapsed >= s.at && this.elapsed < s.at + s.hold) ?? null;
    if (cue !== this.subtitle) {
      this.subtitle = cue;
      this.emit();
    }

    // The scenes breathe on the motion clock, which the `stillness` channel slows.
    const calm = 1 - (this.levels['stillness'] ?? 0) * 0.85;
    if (!this.opts.reducedMotion) this.motionTime += step * calm;

    const master = this.visible;
    this.scene.apply(this.motionTime, this.opts.reducedMotion ? 0 : step, this.levels, master);
  }

  private lastEmitted = '';
  private emit() {
    if (!this.opts.onStatus) return;
    const s = this.status();
    const key = `${s.page}|${s.state}|${s.phase}|${s.subtitle?.at ?? ''}|${s.foundCount}|${s.lostCount}`;
    if (key === this.lastEmitted) return;
    this.lastEmitted = key;
    this.opts.onStatus(s);
  }

  /** Emit status on a cadence so elapsed/phase readouts stay live in diagnostics. */
  tickStatus() {
    if (!this.opts.onStatus) return;
    this.opts.onStatus(this.status());
  }

  private disposeScene() {
    this.scene?.dispose();
    this.scene = null;
  }

  dispose() {
    this.disposeScene();
    this.story = null;
    this.state = 'idle';
    this.levels = {};
    this.currentPhase = null;
    this.subtitle = null;
  }
}
