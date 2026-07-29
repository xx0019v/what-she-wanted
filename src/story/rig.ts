// ────────────────────────────────────────────────────────────────
// 2.5-D character rig — the PRINTED FIGURE ITSELF, animated.
//
// `scripts/build-character-rig.py` cuts the painted figure out of the page art
// into parts (hair / body / arms / skirt / legs / robe / staff / hat) and fills
// the hole it left with the surrounding artwork. Here those real painted pixels
// are hung on pivots and moved, with the fill behind them, so at rest the page
// looks exactly like the print — and when she moves, it is HER that moves, not
// a silhouette drawn over her.
//
// Parts rotate about authored pivots (neck, waist, hip, shoulder), so a lean
// bends at the waist and a step swings from the hip instead of sliding a sprite.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Bag, L, radialTex, type Layer } from './sceneKit';

export interface RigPartMeta {
  texture: string;
  x: number; y: number; w: number; h: number;
  pivotX: number; pivotY: number;
  z: number;
}
export interface RigMeta {
  page: number;
  character: string;
  pageAspect: number;
  parts: Record<string, RigPartMeta>;
  patch?: { texture: string; x: number; y: number; w: number; h: number };
}

let RIGS: Record<string, RigMeta> | null = null;
let rigsPromise: Promise<Record<string, RigMeta>> | null = null;

/** Load the generated rig metadata once. */
export function loadRigs(): Promise<Record<string, RigMeta>> {
  if (RIGS) return Promise.resolve(RIGS);
  if (!rigsPromise) {
    rigsPromise = fetch(`${import.meta.env.BASE_URL}rig/rigs.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => { RIGS = j; return j; })
      .catch(() => ({}));
  }
  return rigsPromise;
}

export function rigMeta(page: number, character: string): RigMeta | undefined {
  return RIGS?.[`${page}-${character}`];
}

/** A part's live transform, written by the performance each frame. */
interface PartState {
  /** rotation about the pivot, radians */
  rot: number;
  /** offset in anchor units */
  dx: number; dy: number;
  /** uniform-ish scale about the pivot */
  sx: number; sy: number;
  /** brightness multiplier (1 = as printed) */
  tint: number;
}

export interface RigPerformance {
  /** 0..1 — how much of the rig's motion is applied at all. */
  presence?: string;
  /** the slow rise and fall of breathing */
  breathe?: string;
  /** weight shifting forward, bending at the waist */
  lean?: string;
  /** hair and skirt moving in the scene's air */
  sway?: string;
  /** a step: legs alternate and the body rides it */
  step?: string;
  /** head turning to look toward something */
  look?: string;
  /** an arm / staff extending toward the other character */
  reach?: string;
  /** the figure's own light (rim + heart) */
  glow?: string;
  /** her light leaving her: posture sags, brightness falls */
  drain?: string;
}

export interface RigOptions {
  page: number;
  character: string;
  /** +1 faces right, -1 faces left. Motion directions follow this. */
  facing?: 1 | -1;
  perf: RigPerformance;
  /**
   * Cover the printed figure with the generated fill. DEFAULT FALSE, and that
   * is a measured decision, not a shortcut: the fill was tested on the page and
   * read as a bright rectangle hanging behind her head, because an inpainted
   * region can never match a hand-painted treeline exactly. With the motion kept
   * to joint rotations and a few pixels of travel, the moving parts stay over
   * their own source pixels and occlude the printed figure by themselves — so
   * she moves, nothing doubles, and no fill is visible. Enable it only for a
   * page whose motion is large enough to walk off the original.
   */
  usePatch?: boolean;
  rimHue?: string;
  rimColor?: number;
}

export interface RigHandle extends Layer {
  /** Live anchor points so magic can start at her chest / end at a hand. */
  anchors: { chest: THREE.Vector3; hand: THREE.Vector3; head: THREE.Vector3; feet: THREE.Vector3 };
  ok: boolean;
}

/**
 * Build the rig. If the generated assets are missing this returns `ok:false`
 * and an inert layer, so a page always renders even before the assets exist.
 */
export function addRig(b: Bag, group: THREE.Group, o: RigOptions): RigHandle {
  const meta = rigMeta(o.page, o.character);
  const face = o.facing ?? 1;
  const loader = new THREE.TextureLoader();
  const anchors = {
    chest: new THREE.Vector3(), hand: new THREE.Vector3(),
    head: new THREE.Vector3(), feet: new THREE.Vector3(),
  };

  if (!meta) {
    return { ok: false, anchors, update: () => undefined };
  }

  const root = new THREE.Group();
  group.add(root);

  // ── the fill that hides the printed figure ──
  let patchMat: THREE.MeshBasicMaterial | null = null;
  if ((o.usePatch ?? false) && meta.patch) {
    const t = loader.load(`${import.meta.env.BASE_URL}${meta.patch.texture}`, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; });
    b.T(t);
    patchMat = b.M(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }));
    const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(meta.patch.w, meta.patch.h)), patchMat);
    m.position.set(meta.patch.x, meta.patch.y, 0.001);
    // these layers sit within a millimetre of each other, so distance sorting is
    // unreliable: order them explicitly instead
    m.renderOrder = 10;
    root.add(m);
  }

  // ── the parts: real painted pixels on pivots ──
  interface Part { name: string; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; meta: RigPartMeta; st: PartState; pivot: THREE.Group }
  const parts: Part[] = [];
  for (const [name, pm] of Object.entries(meta.parts)) {
    const t = loader.load(`${import.meta.env.BASE_URL}${pm.texture}`, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; });
    b.T(t);
    const mat = b.M(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }));
    const mesh = new THREE.Mesh(b.G(new THREE.PlaneGeometry(pm.w, pm.h)), mat);
    // a pivot group placed at the joint; the quad hangs off it at its offset
    const pivot = new THREE.Group();
    pivot.position.set(pm.pivotX, pm.pivotY, 0.004 + pm.z);
    mesh.position.set(pm.x - pm.pivotX, pm.y - pm.pivotY, 0);
    mesh.renderOrder = 11 + Math.round(pm.z * 1000);
    pivot.add(mesh);
    root.add(pivot);
    parts.push({ name, mesh, mat, meta: pm, pivot, st: { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1, tint: 1 } });
  }

  const byName = (n: string) => parts.find((p) => p.name === n);

  // ── her own light: a rim behind the figure and a heart at the chest ──
  const rimMat = b.M(new THREE.SpriteMaterial({
    map: radialTex(b, o.rimHue ?? 'rgba(206,224,250,0.9)'), color: o.rimColor ?? 0xcee0fa,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  })) as THREE.SpriteMaterial;
  const rim = new THREE.Sprite(rimMat);
  rim.renderOrder = 9; // behind the figure
  root.add(rim);
  const heartMat = b.M(new THREE.SpriteMaterial({
    map: radialTex(b, o.rimHue ?? 'rgba(206,224,250,0.9)'), color: o.rimColor ?? 0xcee0fa,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  })) as THREE.SpriteMaterial;
  const heart = new THREE.Sprite(heartMat);
  heart.renderOrder = 30; // her light reads in front of her
  root.add(heart);

  // figure extents, for placing light and anchors
  const xs = Object.values(meta.parts);
  const top = Math.max(...xs.map((p) => p.y + p.h / 2));
  const bottom = Math.min(...xs.map((p) => p.y - p.h / 2));
  const cx = xs.reduce((a, p) => a + p.x, 0) / xs.length;
  const figH = top - bottom;
  const figW = Math.max(...xs.map((p) => p.w));

  return {
    ok: true,
    anchors,
    update(elapsed, levels, master) {
      const on = L(levels, o.perf.presence);
      const br = L(levels, o.perf.breathe);
      const ln = L(levels, o.perf.lean);
      const sw = L(levels, o.perf.sway);
      const stp = L(levels, o.perf.step);
      const lk = L(levels, o.perf.look);
      const rc = L(levels, o.perf.reach);
      const gl = L(levels, o.perf.glow);
      const dr = L(levels, o.perf.drain);

      // ── the performance ──
      // The step is carried by the LEGS and the lean, not by sliding the whole
      // figure sideways: a large translation drags her off the fill behind her
      // and exposes it. Rotations about real joints stay inside the fill's own
      // feathered edge, so the articulation is large and the seam is not.
      const breath = Math.sin(elapsed * 0.85) * 0.0022 * (0.35 + br);
      const lean = ln * 0.06 * face;            // radians at the waist
      const forward = ln * 0.003 * face;        // a few pixels only
      // one deliberate step: the legs swing from the hip, slowly, and settle
      const stride = Math.sin(elapsed * 1.05) * stp;
      const sag = dr * 0.035;                   // her light leaving takes her posture with it

      for (const p of parts) {
        const s = p.st;
        s.rot = 0; s.dx = forward; s.dy = breath; s.sx = 1; s.sy = 1; s.tint = 1;

        switch (p.name) {
          case 'hair':
            // lags the body, swings in the air, tips when she looks
            s.rot = lean * 1.15 + Math.sin(elapsed * 0.7) * 0.05 * (0.2 + sw) + lk * 0.1 * face - sag * 0.6;
            s.dy = breath * 1.3;
            break;
          case 'body':
            // the torso is tall; keep its swing modest and let the breath show
            // in scale, which never uncovers anything
            s.rot = (lean - sag) * 0.6;
            s.sy = 1 + breath * 3.0 + br * 0.005;
            break;
          case 'armL':
            s.rot = lean * 0.9 + Math.sin(elapsed * 0.6) * 0.03 * (0.2 + sw) - stride * 0.12;
            break;
          case 'armR':
            // the reaching arm
            s.rot = lean * 0.9 - Math.sin(elapsed * 0.6) * 0.03 * (0.2 + sw) + stride * 0.12 - rc * 0.5 * face;
            break;
          case 'skirt':
            s.rot = lean * 0.7 + Math.sin(elapsed * 0.55 + 0.8) * 0.055 * (0.2 + sw) + stride * 0.06;
            s.sx = 1 + sw * 0.03 + ln * 0.015;
            break;
          case 'robe':
            // a long trailing cut-out: breathe it with scale, not with swing
            s.rot = lean * 0.3 + Math.sin(elapsed * 0.5 + 0.8) * 0.014 * (0.2 + sw);
            s.sx = 1 + sw * 0.02 + rc * 0.02;
            s.sy = 1 + sw * 0.012;
            break;
          case 'legL':
            s.rot = stride * 0.30 + lean * 0.4;
            break;
          case 'legR':
            s.rot = -stride * 0.30 + lean * 0.4;
            break;
          case 'staff':
            // Lifted and aimed toward the other character — but only slightly.
            // A cut-out this long sweeps its captured background into view as
            // soon as it swings, so the staff tilts a few degrees and the drama
            // is carried by the light climbing it and the hand that holds it.
            s.rot = -rc * 0.10 * face + Math.sin(elapsed * 0.5) * 0.010;
            s.dy = breath + rc * 0.012;
            break;
          case 'hat':
            s.rot = lean * 0.5 + lk * 0.05 * face;
            s.dy = breath * 1.2;
            break;
          default:
            s.rot = lean * 0.8;
        }

        p.pivot.rotation.z = s.rot;
        p.pivot.position.x = p.meta.pivotX + s.dx;
        p.pivot.position.y = p.meta.pivotY + s.dy;
        p.pivot.scale.set(s.sx, s.sy, 1);
        // the drained figure dims a little; otherwise she is exactly as printed
        const dim = 1 - dr * 0.35;
        p.mat.color.setScalar(dim);
        p.mat.opacity = master * on;
      }

      if (patchMat) patchMat.opacity = master * on;

      // her light
      const bodyPart = byName('body');
      const chestY = bodyPart ? bodyPart.meta.y : (top + bottom) / 2;
      rim.scale.set(figW * 2.1, figH * 1.15, 1);
      rim.position.set(cx + forward + face * figW * 0.1, (top + bottom) / 2 + breath, 0.0005);
      rimMat.opacity = master * on * (0.05 + gl * 0.2) * (0.7 + 0.3 * Math.sin(elapsed * 0.6));

      const heartLevel = Math.max(0, (0.1 + gl * 0.45) * (1 - dr));
      heart.scale.setScalar(figW * (0.7 + gl * 0.45) * (1 - dr * 0.4));
      heart.position.set(cx + forward, chestY + breath, 0.02);
      heartMat.opacity = master * on * heartLevel * (0.6 + 0.4 * Math.sin(elapsed * 1.1));

      // live anchors for the magic
      anchors.chest.set(cx + forward, chestY + breath, 0.03);
      anchors.head.set(cx + forward, top + breath, 0.02);
      anchors.feet.set(cx + forward, bottom, 0.01);
      const st = byName('staff');
      if (st) {
        anchors.hand.set(st.meta.pivotX + s_offset(rc, face), st.meta.y + st.meta.h * 0.42 + breath, 0.03);
      } else {
        anchors.hand.set(cx + face * figW * (0.5 + rc * 0.3) + forward, chestY + breath, 0.03);
      }
    },
  };
}

const s_offset = (reach: number, face: number) => -face * reach * 0.04;
