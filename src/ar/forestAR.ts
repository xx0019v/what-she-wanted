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

const PAGE_ASPECT = 1080 / 1920; // 0.5625

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
  private anchorGroup: THREE.Group | null = null;
  private effects: Array<{ update: (t: number, dt: number) => void }> = [];
  private textures: THREE.Texture[] = [];
  private geoms: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];
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
      this.anchorGroup = anchor.group;
      this.buildEffects(anchor.group);

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
        if (!this.opts.reducedMotion) for (const e of this.effects) e.update(t, dt);
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

  // ── effects ───────────────────────────────────────────
  private track<T extends THREE.Texture | THREE.BufferGeometry | THREE.Material>(o: T): T {
    if ((o as any).isTexture) this.textures.push(o as THREE.Texture);
    else if ((o as any).isBufferGeometry) this.geoms.push(o as THREE.BufferGeometry);
    else this.mats.push(o as THREE.Material);
    return o;
  }

  private radial(color: string, stop = '1'): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, color);
    grd.addColorStop(parseFloat(stop), color.replace(/[\d.]+\)$/, '0)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return this.track(t);
  }

  /** A vertical shaft: bright centre column fading to the sides and to top/bottom. */
  private beam(color: string): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d')!;
    const hx = g.createLinearGradient(0, 0, 64, 0);
    hx.addColorStop(0, 'rgba(0,0,0,0)');
    hx.addColorStop(0.5, color);
    hx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hx;
    g.fillRect(0, 0, 64, 256);
    // fade the vertical extremes
    const vy = g.createLinearGradient(0, 0, 0, 256);
    vy.addColorStop(0, 'rgba(0,0,0,1)');
    vy.addColorStop(0.15, 'rgba(0,0,0,0)');
    vy.addColorStop(0.85, 'rgba(0,0,0,0)');
    vy.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = vy;
    g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return this.track(t);
  }

  private buildEffects(group: THREE.Group) {
    const q = this.opts.quality;
    // 1) Ground fog — a few soft additive planes hugging the lower page.
    const fogTex = this.radial('rgba(200,214,240,0.5)');
    const fogLayers = q === 'low' ? 2 : 3;
    for (let i = 0; i < fogLayers; i++) {
      const geo = this.track(new THREE.PlaneGeometry(0.9, 0.16));
      const mat = this.track(new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
      const m = new THREE.Mesh(geo, mat);
      m.position.set((i - 1) * 0.12, -PAGE_ASPECT * 0.5 + 0.05 + i * 0.02, 0.006 + i * 0.004);
      group.add(m);
      const baseX = m.position.x;
      const sp = 0.05 + i * 0.02;
      this.effects.push({
        update: (t) => {
          m.position.x = baseX + Math.sin(t * sp) * 0.04;
          (m.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.4 + i));
        },
      });
    }

    // 2) Fireflies — a handful, warm, at varied depth (parallax).
    const flyN = q === 'low' ? 8 : 14;
    const flyTex = this.radial('rgba(255,236,180,1)');
    const flyPos = new Float32Array(flyN * 3);
    const flyBase: number[] = [];
    for (let i = 0; i < flyN; i++) {
      const x = (Math.random() - 0.5) * 0.8;
      const y = -PAGE_ASPECT * 0.5 + Math.random() * PAGE_ASPECT * 0.7;
      const z = 0.01 + Math.random() * 0.14;
      flyPos[i * 3] = x; flyPos[i * 3 + 1] = y; flyPos[i * 3 + 2] = z;
      flyBase.push(x, y, z);
    }
    const flyGeo = this.track(new THREE.BufferGeometry());
    flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
    const flyMat = this.track(new THREE.PointsMaterial({ map: flyTex, color: 0xffe6a6, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    const flies = new THREE.Points(flyGeo, flyMat);
    group.add(flies);
    this.effects.push({
      update: (t) => {
        const arr = (flyGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < flyN; i++) {
          arr[i * 3] = flyBase[i * 3] + Math.sin(t * 0.5 + i) * 0.02;
          arr[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(t * 0.7 + i * 1.3) * 0.015;
        }
        (flyGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        flyMat.opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 1.4));
      },
    });

    // 3) Moon — a layered halo (wide glow + a faint luminous disc) over the
    //    moon in the upper-centre of the page, breathing very slowly.
    const moonPos = new THREE.Vector3(0.0, PAGE_ASPECT * 0.34, 0.004);
    const haloTex = this.radial('rgba(200,220,250,0.9)');
    const haloMat = this.track(new THREE.SpriteMaterial({ map: haloTex, color: 0xcfe0f6, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })) as unknown as THREE.SpriteMaterial;
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(0.42, 0.42, 1);
    halo.position.copy(moonPos);
    group.add(halo);

    const discTex = this.radial('rgba(238,244,251,1)', '0.62');
    const discMat = this.track(new THREE.SpriteMaterial({ map: discTex, color: 0xeef4fb, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })) as unknown as THREE.SpriteMaterial;
    const disc = new THREE.Sprite(discMat);
    disc.scale.set(0.13, 0.13, 1);
    disc.position.copy(moonPos).setZ(0.0045);
    group.add(disc);
    this.effects.push({
      update: (t) => {
        const b = 0.5 + 0.5 * Math.sin(t * 0.5);
        haloMat.opacity = 0.14 + 0.08 * b;
        discMat.opacity = 0.12 + 0.05 * b;
      },
    });

    // 3b) Moonbeam — one soft vertical shaft descending from the moon. Additive
    //     and vertically faded so it never darkens the printed art beneath it.
    const beamTex = this.beam('rgba(206,222,246,0.6)');
    const beamGeo = this.track(new THREE.PlaneGeometry(0.26, PAGE_ASPECT * 0.9));
    const beamMat = this.track(new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0.0, PAGE_ASPECT * 0.02, 0.003);
    group.add(beam);
    this.effects.push({
      update: (t) => {
        beamMat.opacity = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.32 + 1.1));
        beam.scale.x = 1 + 0.06 * Math.sin(t * 0.4);
      },
    });

    // 4) A little air around the girl (lower-centre) — sparse cool particles rising.
    const airN = q === 'low' ? 5 : 8;
    const airTex = this.radial('rgba(190,205,240,1)');
    const airPos = new Float32Array(airN * 3);
    const airSeed: number[] = [];
    for (let i = 0; i < airN; i++) {
      airPos[i * 3] = -0.02 + (Math.random() - 0.5) * 0.12;
      airPos[i * 3 + 1] = -PAGE_ASPECT * 0.35 + Math.random() * 0.1;
      airPos[i * 3 + 2] = 0.02 + Math.random() * 0.08;
      airSeed.push(Math.random() * 10);
    }
    const airGeo = this.track(new THREE.BufferGeometry());
    airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3));
    const airMat = this.track(new THREE.PointsMaterial({ map: airTex, color: 0xbcd0f0, size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    const air = new THREE.Points(airGeo, airMat);
    group.add(air);
    const airBaseY = airPos.slice();
    this.effects.push({
      update: (t) => {
        const arr = (airGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < airN; i++) {
          const rise = ((t * 0.03 + airSeed[i]) % 0.2);
          arr[i * 3 + 1] = airBaseY[i * 3 + 1] + rise;
          arr[i * 3] = airBaseY[i * 3] + Math.sin(t * 0.6 + airSeed[i]) * 0.01;
        }
        (airGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        airMat.opacity = 0.3 + 0.2 * Math.sin(t * 0.8);
      },
    });
  }

  dispose() {
    this.disposed = true;
    try {
      this.mindar?.renderer.setAnimationLoop(null);
      this.mindar?.stop();
    } catch {
      /* already stopped */
    }
    this.textures.forEach((t) => t.dispose());
    this.geoms.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.anchorGroup?.clear();
    this.effects = [];
  }
}
