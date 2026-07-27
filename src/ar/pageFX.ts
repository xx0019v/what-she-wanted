// ────────────────────────────────────────────────────────────────
// Per-page anchor FX. Each printed page gets its OWN spatial staging tied to
// that page's story beat — never the same effect reused. All procedural, all
// additive over the printed art, all built to spill past the paper's edge.
//
//   p4  THE FOREST DOES NOT STAY ON THE PAGE   → buildAnchorFX (forest, moon)
//   p5  THE SPACE BETWEEN THEM HOLDS THE PROMISE → contract space (blue↔violet)
//   p11 THE MOON REMEMBERS                       → blue→violet moon + stillness
//   p17 SHE BECAME THE ONE WHO WAS WAITING       → the cycle, colour returns
//
// Anchor space: page width = 1 (x ∈ [-0.5,0.5]); height 0.5625 (y ∈ ±0.281);
// +z toward the viewer.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildAnchorFX, PAGE_ASPECT, type AnchorFX, type AnchorFXOptions } from './anchorFX';

export type ARPage = 4 | 5 | 11 | 17;
export type { AnchorFX } from './anchorFX';

// Which printed page each variant expects (for the preview + targets).
export const AR_PAGE_IMAGE: Record<ARPage, number> = { 4: 4, 5: 5, 11: 11, 17: 17 };

const HALF_H = PAGE_ASPECT * 0.5;

// ── shared texture factories (caller tracks the returned texture) ──────────
function radialTex(color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function ringTex(color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 96, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.72, 'rgba(0,0,0,0)');
  grd.addColorStop(0.86, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function beamTex(color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  const hx = g.createLinearGradient(0, 0, 64, 0);
  hx.addColorStop(0, 'rgba(0,0,0,0)'); hx.addColorStop(0.5, color); hx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hx; g.fillRect(0, 0, 64, 256);
  const vy = g.createLinearGradient(0, 0, 0, 256);
  vy.addColorStop(0, 'rgba(0,0,0,1)'); vy.addColorStop(0.14, 'rgba(0,0,0,0)');
  vy.addColorStop(0.86, 'rgba(0,0,0,0)'); vy.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = vy; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

// small tracked-resource helper shared by the variant builders
interface Ctx {
  group: THREE.Group;
  q: 'high' | 'low';
  tex: THREE.Texture[];
  geo: THREE.BufferGeometry[];
  mat: THREE.Material[];
  fx: Array<(t: number, dt: number) => void>;
}
const mkCtx = (group: THREE.Group, q: 'high' | 'low'): Ctx => ({ group, q, tex: [], geo: [], mat: [], fx: [] });
const finish = (c: Ctx): AnchorFX => ({
  update: (t, dt) => { for (const e of c.fx) e(t, dt); },
  dispose: () => {
    c.tex.forEach((x) => x.dispose());
    c.geo.forEach((x) => x.dispose());
    c.mat.forEach((x) => x.dispose());
    c.group.clear();
  },
});

// ── p5 — THE SPACE BETWEEN THEM HOLDS THE PROMISE ─────────────────────────
// Girl (left) and witch (right). Blue memory motes rise on her side, violet on
// the witch's; they drift to the centre and mingle without fully merging. A
// thin light climbs the staff. A soft violet bloom holds the space between.
function buildContractFX(group: THREE.Group, opts: AnchorFXOptions): AnchorFX {
  const c = mkCtx(group, opts.quality);
  const GIRL_X = -0.16, WITCH_X = 0.24, MID = new THREE.Vector3(0.03, 0.0, 0.07);

  // two streams that converge on the centre
  const stream = (side: 'blue' | 'violet') => {
    const n = c.q === 'low' ? 16 : 28;
    const startX = side === 'blue' ? GIRL_X : WITCH_X;
    const col = side === 'blue' ? 'rgba(150,190,244,1)' : 'rgba(176,132,224,1)';
    const tex = radialTex(col); c.tex.push(tex);
    const pos = new Float32Array(n * 3);
    const seed: number[] = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = startX + (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 1] = -0.06 + Math.random() * 0.14;
      pos[i * 3 + 2] = 0.04 + Math.random() * 0.12;
      seed.push(Math.random());
    }
    const geo = new THREE.BufferGeometry(); c.geo.push(geo);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: tex, color: side === 'blue' ? 0x9ec2f4 : 0xb084e0, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    c.mat.push(mat);
    const pts = new THREE.Points(geo, mat); group.add(pts);
    const base = pos.slice();
    c.fx.push((t) => {
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        const phase = (t * 0.18 + seed[i]) % 1;          // 0 at source → 1 at centre
        arr[i * 3] = base[i * 3] + (MID.x - base[i * 3]) * phase + Math.sin(t + seed[i] * 9) * 0.006;
        arr[i * 3 + 1] = base[i * 3 + 1] + (MID.y - base[i * 3 + 1]) * phase + Math.sin(t * 1.3 + i) * 0.01;
        arr[i * 3 + 2] = base[i * 3 + 2] + (MID.z - base[i * 3 + 2]) * phase;
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = 0.5 + 0.35 * Math.sin(t * 0.8 + (side === 'blue' ? 0 : 1.6));
    });
  };
  stream('blue');
  stream('violet');

  // the promise — a soft violet bloom held at the centre (never a magic circle)
  const bloomTex = radialTex('rgba(168,128,220,0.9)'); c.tex.push(bloomTex);
  const bloomMat = new THREE.SpriteMaterial({ map: bloomTex, color: 0xa884dc, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(bloomMat);
  const bloom = new THREE.Sprite(bloomMat); bloom.scale.set(0.26, 0.26, 1); bloom.position.copy(MID); group.add(bloom);
  c.fx.push((t) => {
    bloomMat.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.6));
    bloom.scale.setScalar(0.24 + 0.03 * Math.sin(t * 0.5));
  });

  // thin light climbing the witch's staff (right)
  const staffTex = beamTex('rgba(190,160,236,0.8)'); c.tex.push(staffTex);
  const staffMat = new THREE.MeshBasicMaterial({ map: staffTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(staffMat);
  const staffGeo = new THREE.PlaneGeometry(0.08, PAGE_ASPECT * 0.7); c.geo.push(staffGeo);
  const staff = new THREE.Mesh(staffGeo, staffMat); staff.position.set(WITCH_X + 0.05, 0.02, 0.05); group.add(staff);
  c.fx.push((t) => { staffMat.opacity = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9)); });

  // moon halo lifting off, centred above
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(200,220,250,0.9)'), color: 0xcfe0f6, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  c.tex.push(halo.material.map!); c.mat.push(halo.material);
  halo.scale.set(0.3, 0.3, 1); halo.position.set(0, PAGE_ASPECT * 0.32, 0.12); group.add(halo);
  c.fx.push((t) => { (halo.material as THREE.SpriteMaterial).opacity = 0.09 + 0.05 * Math.sin(t * 0.5); });

  return finish(c);
}

// ── p11 — THE MOON REMEMBERS ─────────────────────────────────────────────
// The floating moon turns from blue to violet over a few seconds; memory rings
// form around it; a violet wash seeps outward across the space; then it holds
// still. A slow, breathing cycle — the symbolic centre of the whole work.
function buildVioletMoonFX(group: THREE.Group, opts: AnchorFXOptions): AnchorFX {
  const c = mkCtx(group, opts.quality);
  const moonPos = new THREE.Vector3(0, PAGE_ASPECT * 0.06, 0.16);

  // moon disc (colour driven each frame)
  const discTex = radialTex('rgba(240,246,255,1)'); c.tex.push(discTex);
  const discMat = new THREE.SpriteMaterial({ map: discTex, color: 0xdfeaff, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(discMat);
  const disc = new THREE.Sprite(discMat); disc.scale.set(0.24, 0.24, 1); disc.position.copy(moonPos); group.add(disc);

  const haloTex = radialTex('rgba(200,220,250,0.9)'); c.tex.push(haloTex);
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, color: 0xcfe0f6, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(haloMat);
  const halo = new THREE.Sprite(haloMat); halo.scale.set(0.6, 0.6, 1); halo.position.copy(moonPos).setZ(moonPos.z - 0.01); group.add(halo);

  // memory rings that form as it turns violet
  const rings: Array<{ s: THREE.Sprite; m: THREE.SpriteMaterial }> = [];
  for (let i = 0; i < 3; i++) {
    const rt = ringTex('rgba(176,140,226,0.8)'); c.tex.push(rt);
    const rm = new THREE.SpriteMaterial({ map: rt, color: 0xb08ce2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    c.mat.push(rm);
    const rs = new THREE.Sprite(rm); rs.position.copy(moonPos).setZ(moonPos.z - 0.005); group.add(rs);
    rings.push({ s: rs, m: rm });
  }

  // violet wash that seeps outward across the whole page (large, soft)
  const washTex = radialTex('rgba(150,110,210,0.7)'); c.tex.push(washTex);
  const washMat = new THREE.SpriteMaterial({ map: washTex, color: 0x9670d2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(washMat);
  const wash = new THREE.Sprite(washMat); wash.scale.set(0.4, 0.4, 1); wash.position.copy(moonPos).setZ(0.03); group.add(wash);

  // rising violet memory motes
  const n = c.q === 'low' ? 18 : 32;
  const moteTex = radialTex('rgba(178,140,228,1)'); c.tex.push(moteTex);
  const mpos = new Float32Array(n * 3); const mseed: number[] = [];
  for (let i = 0; i < n; i++) {
    mpos[i * 3] = (Math.random() - 0.5) * 1.1;
    mpos[i * 3 + 1] = -HALF_H + Math.random() * PAGE_ASPECT;
    mpos[i * 3 + 2] = 0.03 + Math.random() * 0.2;
    mseed.push(Math.random() * 10);
  }
  const mgeo = new THREE.BufferGeometry(); c.geo.push(mgeo);
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mmat = new THREE.PointsMaterial({ map: moteTex, color: 0xb28ce4, size: 0.028, sizeAttenuation: true, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(mmat);
  const motes = new THREE.Points(mgeo, mmat); group.add(motes);
  const mbase = mpos.slice();

  const CYCLE = 16; // seconds: 0–5 transition, 5–11 hold (stillness), 11–16 ease back
  c.fx.push((t, _dt) => {
    const phase = (t % CYCLE);
    // 0→1 violet amount, then hold, then back
    let v: number;
    if (phase < 5) v = phase / 5;
    else if (phase < 11) v = 1;              // the important stillness
    else v = 1 - (phase - 11) / 5;
    const ve = v * v * (3 - 2 * v);          // smoothstep
    // moon colour blue→violet
    discMat.color.setHSL(0.62 - ve * 0.14, 0.5 + ve * 0.2, 0.86 - ve * 0.06);
    haloMat.color.setHSL(0.62 - ve * 0.12, 0.5, 0.8);
    discMat.opacity = 0.9 - ve * 0.06 + 0.03 * Math.sin(t * 0.5);
    haloMat.opacity = 0.14 + 0.06 * Math.sin(t * 0.4) + ve * 0.04;
    // rings expand + fade in with violet, gently, staggered
    rings.forEach((r, i) => {
      const local = THREE.MathUtils.clamp(ve * 1.4 - i * 0.28, 0, 1);
      const sc = 0.28 + i * 0.16 + local * 0.12 + 0.02 * Math.sin(t * 0.5 + i);
      r.s.scale.set(sc, sc, 1);
      r.m.opacity = local * (0.18 - i * 0.04);
    });
    // wash seeps outward as it turns violet, holds, recedes
    wash.scale.setScalar(0.36 + ve * 0.5);
    washMat.opacity = ve * 0.14;
    // motes rise, tinted stronger with violet
    const arr = (mgeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 1] = mbase[i * 3 + 1] + ((t * 0.04 + mseed[i]) % 0.4);
      arr[i * 3] = mbase[i * 3] + Math.sin(t * 0.5 + mseed[i]) * 0.01;
    }
    (mgeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    mmat.opacity = 0.25 + ve * 0.35;
  });

  return finish(c);
}

// ── p17 — SHE BECAME THE ONE WHO WAS WAITING ─────────────────────────────
// The moon returns to the cover's blue. Two presences: the departing girl
// (centre, white) and the watcher (left, violet). Over a slow cycle the
// watcher's violet swells — the quiet reveal — while the opening fog drifts
// again across the edges. It never resolves to black: the world continues.
function buildCycleFX(group: THREE.Group, opts: AnchorFXOptions): AnchorFX {
  const c = mkCtx(group, opts.quality);

  // cover-blue moon lifting off, upper centre
  const moonPos = new THREE.Vector3(0.04, PAGE_ASPECT * 0.28, 0.14);
  const discTex = radialTex('rgba(226,238,255,1)'); c.tex.push(discTex);
  const discMat = new THREE.SpriteMaterial({ map: discTex, color: 0xbcd2f2, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(discMat);
  const disc = new THREE.Sprite(discMat); disc.scale.set(0.17, 0.17, 1); disc.position.copy(moonPos); group.add(disc);
  c.fx.push((t) => { discMat.opacity = 0.42 + 0.06 * Math.sin(t * 0.4); disc.scale.setScalar(0.17 + 0.004 * Math.sin(t * 0.5)); });

  // opening-fog reprise — drifts across the edges (same motion as p4)
  const fogTex = radialTex('rgba(200,214,240,0.5)'); c.tex.push(fogTex);
  for (let i = 0; i < (c.q === 'low' ? 2 : 3); i++) {
    const geo = new THREE.PlaneGeometry(1.5, 0.3); c.geo.push(geo);
    const mat = new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }); c.mat.push(mat);
    const m = new THREE.Mesh(geo, mat); const baseY = -HALF_H + 0.04 + i * 0.05;
    m.position.set((i - 1) * 0.18, baseY, 0.02 + i * 0.02); group.add(m);
    const bx = m.position.x, sp = 0.04 + i * 0.02;
    c.fx.push((t) => { m.position.x = bx + Math.sin(t * sp) * 0.08; (m.material as THREE.MeshBasicMaterial).opacity = 0.07 + 0.04 * Math.sin(t * 0.4 + i); });
  }

  // the watcher's violet aura (left) — swells slowly: the reveal
  const auraTex = radialTex('rgba(158,124,216,0.9)'); c.tex.push(auraTex);
  const auraMat = new THREE.SpriteMaterial({ map: auraTex, color: 0x9a7cd8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(auraMat);
  const aura = new THREE.Sprite(auraMat); aura.scale.set(0.3, 0.5, 1); aura.position.set(-0.32, -0.02, 0.1); group.add(aura);

  // the departing girl's cool aura (centre)
  const gAuraTex = radialTex('rgba(196,214,246,0.9)'); c.tex.push(gAuraTex);
  const gAuraMat = new THREE.SpriteMaterial({ map: gAuraTex, color: 0xbcd2f2, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(gAuraMat);
  const gAura = new THREE.Sprite(gAuraMat); gAura.scale.set(0.18, 0.3, 1); gAura.position.set(0.04, -0.05, 0.08); group.add(gAura);

  // a faint violet thread from watcher toward the girl — the wish, passing on
  const threadTex = beamTex('rgba(176,140,226,0.7)'); c.tex.push(threadTex);
  const threadMat = new THREE.MeshBasicMaterial({ map: threadTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.mat.push(threadMat);
  const threadGeo = new THREE.PlaneGeometry(0.36, 0.05); c.geo.push(threadGeo);
  const thread = new THREE.Mesh(threadGeo, threadMat); thread.position.set(-0.14, -0.04, 0.09); group.add(thread);

  const CYCLE = 18;
  c.fx.push((t) => {
    const phase = (t % CYCLE) / CYCLE;            // 0..1
    const reveal = THREE.MathUtils.smoothstep(phase, 0.15, 0.6); // watcher emerges
    auraMat.opacity = 0.06 + reveal * 0.22 + 0.03 * Math.sin(t * 0.7);
    aura.scale.set(0.28 + reveal * 0.08, 0.48 + reveal * 0.12, 1);
    gAuraMat.opacity = 0.14 - reveal * 0.04 + 0.03 * Math.sin(t * 0.6); // she fades on
    threadMat.opacity = THREE.MathUtils.smoothstep(phase, 0.4, 0.7) * (0.12 + 0.05 * Math.sin(t)) * (1 - THREE.MathUtils.smoothstep(phase, 0.85, 1));
  });

  return finish(c);
}

// ── dispatcher ────────────────────────────────────────────────────────────
export function buildPageFX(page: ARPage, group: THREE.Group, opts: AnchorFXOptions): AnchorFX {
  switch (page) {
    case 5: return buildContractFX(group, opts);
    case 11: return buildVioletMoonFX(group, opts);
    case 17: return buildCycleFX(group, opts);
    case 4:
    default: return buildAnchorFX(group, opts);
  }
}
