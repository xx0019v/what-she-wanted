// ────────────────────────────────────────────────────────────────
// Forest AR (page 04) — anchored proof of concept.
// MindAR detects the printed page and provides a tracked anchor group in the
// page's own coordinate space. We attach procedural effects (ground fog, a few
// fireflies, a faint moon glow, a little air around the girl) to that group, so
// they sit ON the page and follow it as the page or camera moves. Because the
// layers live at different depths, tilting the phone yields real 2.5D parallax.
//
// Anchor space (MindARThree): the target lies in the XY plane, width = 1
// (x ∈ [-0.5, 0.5]), height = imageH/imageW (page 04 = 0.5625, y ∈ [-0.281, 0.281]),
// +y up, +z toward the viewer. Effects use small positive z to float above paper.
// Nothing opaque is placed over the page's printed text — all layers are additive.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { buildAnchorFX, type AnchorFX } from './anchorFX';

export type ARStatus = 'loading' | 'searching' | 'found' | 'lost';

export interface ARStats {
  status: ARStatus;
  fps: number;
  firstFoundMs: number | null;
  reacquireCount: number;
  targetLoaded: boolean;
  cameraActive: boolean;
  resolution: string;
  device: string;
  error: string | null;
}

export interface ForestAROptions {
  container: HTMLElement;
  targetUrl: string;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  onStatus: (s: ARStatus) => void;
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
  private fx: AnchorFX | null = null;
  private clock = new THREE.Clock();
  private startTime = 0;
  private firstFound: number | null = null;
  private reacquire = 0;
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

      const anchor = mindar.addAnchor(0);
      this.fx = buildAnchorFX(anchor.group, { quality: this.opts.quality });

      anchor.onTargetFound = () => {
        if (this.firstFound === null) this.firstFound = performance.now() - this.startTime;
        if (this.everFound) this.reacquire += 1;
        this.everFound = true;
        this.opts.onStatus('found');
        this.opts.onStats({ status: 'found', firstFoundMs: this.firstFound, reacquireCount: this.reacquire });
      };
      anchor.onTargetLost = () => {
        this.opts.onStatus('lost');
        this.opts.onStats({ status: 'lost' });
      };

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
        const t = this.clock.elapsedTime;
        if (!this.opts.reducedMotion) this.fx?.update(t, dt);
        // fps (rolling ~0.5s)
        this.frames += 1;
        this.fpsT += dt;
        if (this.fpsT >= 0.5) {
          this.opts.onStats({ fps: Math.round(this.frames / this.fpsT) });
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
    this.fx?.dispose();
    this.fx = null;
  }
}
