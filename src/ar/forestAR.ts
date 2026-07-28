// ────────────────────────────────────────────────────────────────
// Printed-page AR — recognition starts that page's STORY.
//
// MindAR detects a printed page and hands us a tracked anchor group in the
// page's own coordinate space. Each page owns an anchor; when its page is
// recognised the StoryRuntime mounts that page's scene into the anchor and
// plays its timeline from zero (after a brief stabilise), pauses it when the
// page leaves view, and resumes or restarts on return. Only one story is ever
// mounted, so two pages can never animate at once.
//
// Anchor space (MindARThree): the target lies in the XY plane, width = 1
// (x ∈ [-0.5, 0.5]), height = imageH/imageW (0.5625, y ∈ [-0.281, 0.281]),
// +y up, +z toward the viewer. Effects use positive z to leave the paper.
// Nothing opaque is placed over the page's printed text — all layers additive.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import type { ARPage } from '../story/storyTypes';
import { StoryRuntime } from '../story/storyRuntime';
import { storyForPage } from '../story/pageStories';
import type { StoryStatus } from '../story/storyTypes';

export type ARStatus = 'loading' | 'searching' | 'found' | 'lost';

export interface ARStats {
  status: ARStatus;
  fps: number;
  firstFoundMs: number | null;
  reacquireCount: number;
  foundCount: number;
  lostCount: number;
  targetIndex: number | null;
  detectedPage: ARPage | null;
  targetLoaded: boolean;
  cameraActive: boolean;
  resolution: string;
  device: string;
  error: string | null;
}

export interface ForestAROptions {
  container: HTMLElement;
  targetUrl: string;
  /** Printed pages in the target file, in tracking-index order (0,1,2,…). */
  pages: ARPage[];
  quality: 'high' | 'low';
  reducedMotion: boolean;
  onStatus: (s: ARStatus) => void;
  /** Optional: which page's target was just found/lost. */
  onPage?: (page: ARPage | null) => void;
  /** Story state / phase / subtitle for the UI and diagnostics. */
  onStory?: (s: StoryStatus) => void;
  onStats: (s: Partial<ARStats>) => void;
}

/** True if the device can create a WebGL context (required by Three/MindAR). */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/** Reject with `code` if `p` hasn't settled in `ms` — never hang the UI. */
function withTimeout<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error(code), { name: code })), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Map a raw camera/startup error to a stable code the UI can localise. */
function classifyCameraError(e: any): string {
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'camera-permission-denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'camera-unavailable';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'camera-in-use';
  if (name === 'camera-timeout') return 'camera-timeout';
  return e?.message || String(e) || 'camera-error';
}

export class ForestAR {
  private mindar: MindARThree | null = null;
  private runtime: StoryRuntime | null = null;
  /** Anchor groups by page, so the runtime can mount a scene into the right one. */
  private anchorGroups = new Map<ARPage, THREE.Group>();
  private trackedCount = 0;
  private clock = new THREE.Clock();
  private startTime = 0;
  private firstFound: number | null = null;
  private reacquire = 0;
  private foundCount = 0;
  private lostCount = 0;
  private everFound = false;
  private frames = 0;
  private fpsT = 0;
  private disposed = false;

  constructor(private opts: ForestAROptions) {}

  async start(): Promise<{ ok: true } | { ok: false; error: string }> {
    this.opts.onStatus('loading');

    // Guard 1 — WebGL. Without it MindAR/Three cannot render; fail fast and
    // cleanly rather than throwing deep inside the library on old devices.
    if (!hasWebGL()) {
      const error = 'webgl-unavailable';
      this.opts.onStats({ error, cameraActive: false });
      return { ok: false, error };
    }

    // Guard 2 — a secure context is required for getUserMedia. The UI already
    // checks this, but belt-and-braces so start() never hangs on http.
    if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      const error = 'insecure-context';
      this.opts.onStats({ error, cameraActive: false });
      return { ok: false, error };
    }

    // Guard 3 — pre-flight the camera ourselves. MindAR swallows the
    // getUserMedia rejection internally (logging it, then hanging or throwing a
    // generic error), so we ask first: this gives us a precise, localisable
    // error (denied / unavailable / busy / timeout) and, on success, we release
    // the stream immediately so MindAR re-acquires the already-granted camera.
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = 'camera-unavailable';
      this.opts.onStats({ error, cameraActive: false });
      return { ok: false, error };
    }
    try {
      const probe = await withTimeout(
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        13000,
        'camera-timeout',
      );
      probe.getTracks().forEach((t) => t.stop());
    } catch (e: any) {
      const error = classifyCameraError(e);
      this.opts.onStats({ error, cameraActive: false });
      return { ok: false, error };
    }
    if (this.disposed) return { ok: false, error: 'disposed' };

    try {
      const mindar = new MindARThree({
        container: this.opts.container,
        imageTargetSrc: this.opts.targetUrl,
        uiScanning: false,
        uiLoading: false,
        uiError: false,
        maxTrack: 1,
        // One-Euro filter: tuned for a calm, poster-stable overlay.
        filterMinCF: 0.0005,
        filterBeta: 0.02,
        warmupTolerance: 2,
        missTolerance: 3,
      });
      this.mindar = mindar;

      // The story runtime owns which page's story is mounted and how far it has
      // played. Recognition only tells it "this page is visible now".
      this.runtime = new StoryRuntime({
        quality: this.opts.quality,
        reducedMotion: this.opts.reducedMotion,
        onStatus: (s) => this.opts.onStory?.(s),
      });

      // One anchor per printed page in the target file (maxTrack:1 → one at a time).
      this.opts.pages.forEach((page, index) => {
        const anchor = mindar.addAnchor(index);
        this.anchorGroups.set(page, anchor.group);

        anchor.onTargetFound = () => {
          if (this.firstFound === null) this.firstFound = performance.now() - this.startTime;
          if (this.everFound) this.reacquire += 1;
          this.everFound = true;
          this.trackedCount += 1;
          this.foundCount += 1;

          // Mount (or resume) this page's story inside its own anchor group.
          const story = storyForPage(page);
          if (story && this.runtime) {
            this.runtime.targetFound(story);
            const g = this.runtime.sceneGroup;
            if (g && g.parent !== anchor.group) anchor.group.add(g);
          }

          this.opts.onPage?.(page);
          this.opts.onStatus('found');
          this.opts.onStats({
            status: 'found',
            firstFoundMs: this.firstFound,
            reacquireCount: this.reacquire,
            foundCount: this.foundCount,
            targetIndex: index,
            detectedPage: page,
          });
        };
        anchor.onTargetLost = () => {
          this.trackedCount = Math.max(0, this.trackedCount - 1);
          this.lostCount += 1;
          this.opts.onStats({ lostCount: this.lostCount });
          if (this.trackedCount === 0) {
            // Hold the timeline and fade over the grace period rather than snap.
            this.runtime?.targetLost();
            this.opts.onPage?.(null);
            this.opts.onStatus('lost');
            this.opts.onStats({ status: 'lost', detectedPage: null, targetIndex: null });
          }
        };
      });

      this.startTime = performance.now();
      // MindAR requests the camera here. On some in-app browsers / blocked
      // permissions the internal getUserMedia can hang instead of rejecting,
      // which used to leave the UI stuck on "Starting camera…" forever.
      // Race it against a timeout so we always resolve to a recoverable state.
      await withTimeout(mindar.start(), 15000, 'camera-timeout');
      if (this.disposed) return { ok: false, error: 'disposed' };
      this.opts.onStatus('searching');

      const vw = mindar.video?.videoWidth ?? 0;
      const vh = mindar.video?.videoHeight ?? 0;
      this.opts.onStats({
        targetLoaded: true,
        cameraActive: true,
        resolution: `${vw}×${vh}`,
        device: navigator.userAgent,
        status: 'searching',
      });

      const { renderer, scene, camera } = mindar;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.quality === 'low' ? 1.3 : 2));
      this.clock.start();
      renderer.setAnimationLoop(() => {
        if (this.disposed) return;
        const dt = Math.min(this.clock.getDelta(), 0.05);
        // The story advances on its own clock, started at recognition.
        this.runtime?.update(dt);
        // fps (rolling ~0.5s) + live story readout for diagnostics
        this.frames += 1;
        this.fpsT += dt;
        if (this.fpsT >= 0.5) {
          this.opts.onStats({ fps: Math.round(this.frames / this.fpsT) });
          this.runtime?.tickStatus();
          this.frames = 0;
          this.fpsT = 0;
        }
        renderer.render(scene, camera);
      });
      return { ok: true };
    } catch (e: any) {
      const error = classifyCameraError(e);
      this.opts.onStats({ error, cameraActive: false });
      // Tear down the half-started MindAR instance so a retry starts clean.
      try {
        this.mindar?.renderer?.setAnimationLoop(null);
        this.mindar?.stop();
      } catch {
        /* ignore */
      }
      return { ok: false, error };
    }
  }

  dispose() {
    this.disposed = true;
    try {
      this.mindar?.renderer.setAnimationLoop(null);
      this.mindar?.stop();
    } catch {
      /* already stopped */
    }
    this.runtime?.dispose();
    this.runtime = null;
    this.anchorGroups.clear();
  }
}
