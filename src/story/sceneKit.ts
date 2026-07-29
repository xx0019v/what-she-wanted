// ────────────────────────────────────────────────────────────────
// Scene kit — the procedural objects every page's stage is built from.
//
// Each builder adds real geometry to the anchor group and returns a Layer whose
// update() is driven by the story's phase channels. A channel at 0 means the
// object is genuinely absent, so a beat that has not happened yet is not there.
// Everything is generated in code (no photos, no AI art, no stock models) and
// every resource is registered for disposal.
//
// Anchor space: page width = 1 (x ∈ [-0.5,0.5]); height 0.5625 (y ∈ ±0.281);
// +z toward the viewer. Values beyond those bounds deliberately leave the paper.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const PAGE_ASPECT = 1080 / 1920;
export const HALF_H = PAGE_ASPECT * 0.5;

export interface Layer {
  update: (elapsed: number, levels: Readonly<Record<string, number>>, master: number) => void;
}

export type Quality = 'high' | 'low';

/** Tracked-resource bag so a scene disposes completely on page switch. */
export class Bag {
  private tex: THREE.Texture[] = [];
  private geo: THREE.BufferGeometry[] = [];
  private mat: THREE.Material[] = [];
  T<A extends THREE.Texture>(a: A) { this.tex.push(a); return a; }
  G<A extends THREE.BufferGeometry>(a: A) { this.geo.push(a); return a; }
  M<A extends THREE.Material>(a: A) { this.mat.push(a); return a; }
  dispose(group: THREE.Group) {
    this.tex.forEach((x) => x.dispose());
    this.geo.forEach((x) => x.dispose());
    this.mat.forEach((x) => x.dispose());
    group.clear();
  }
}

export const L = (levels: Readonly<Record<string, number>>, k?: string) => (k ? levels[k] ?? 0 : 1);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const q = (quality: Quality, hi: number, lo: number) => (quality === 'low' ? lo : hi);

// ── textures ───────────────────────────────────────────────────
export function radialTex(b: Bag, color: string, mid?: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, color);
  if (mid != null) grd.addColorStop(mid, color.replace(/[\d.]+\)$/, '0.3)'));
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

export function ringTex(b: Bag, color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 92, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0)');
  grd.addColorStop(0.85, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

export function shaftTex(b: Bag, color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  const hx = g.createLinearGradient(0, 0, 64, 0);
  hx.addColorStop(0, 'rgba(0,0,0,0)'); hx.addColorStop(0.5, color); hx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hx; g.fillRect(0, 0, 64, 256);
  const vy = g.createLinearGradient(0, 0, 0, 256);
  vy.addColorStop(0, 'rgba(0,0,0,1)'); vy.addColorStop(0.14, 'rgba(0,0,0,0)');
  vy.addColorStop(0.84, 'rgba(0,0,0,0)'); vy.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = vy; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

export function moonTex(b: Bag): THREE.Texture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const body = g.createRadialGradient(S * 0.4, S * 0.38, S * 0.04, S * 0.5, S * 0.5, S * 0.5);
  body.addColorStop(0, 'rgba(250,252,255,1)');
  body.addColorStop(0.55, 'rgba(220,232,250,0.98)');
  body.addColorStop(0.85, 'rgba(160,182,218,0.88)');
  body.addColorStop(1, 'rgba(160,182,218,0)');
  g.fillStyle = body;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-atop';
  for (const [x, y, r] of [[0.44, 0.46, 0.18], [0.6, 0.56, 0.13], [0.52, 0.36, 0.1]] as const) {
    const mg = g.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S);
    mg.addColorStop(0, 'rgba(150,168,204,0.17)');
    mg.addColorStop(1, 'rgba(150,168,204,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(x * S, y * S, r * S, 0, Math.PI * 2); g.fill();
  }
  const limb = g.createRadialGradient(S * 0.4, S * 0.38, S * 0.26, S * 0.5, S * 0.5, S * 0.5);
  limb.addColorStop(0, 'rgba(0,0,0,0)');
  limb.addColorStop(1, 'rgba(22,30,52,0.4)');
  g.fillStyle = limb; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

/** A tree/branch silhouette with a trunk, limbs and small leaf clusters. */
export function treeTex(b: Bag, leafy = true): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round';
  // trunk
  g.beginPath();
  g.moveTo(58, 256);
  g.bezierCurveTo(54, 180, 60, 130, 62, 92);
  g.lineTo(68, 92);
  g.bezierCurveTo(72, 130, 76, 180, 72, 256);
  g.closePath(); g.fill();
  // limbs
  const limb = (x0: number, y0: number, a: number, len: number, w: number, d: number) => {
    if (d === 0 || len < 6) return;
    const x1 = x0 + Math.cos(a) * len, y1 = y0 - Math.sin(a) * len;
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    limb(x1, y1, a + rnd(0.2, 0.6), len * 0.7, w * 0.6, d - 1);
    limb(x1, y1, a - rnd(0.2, 0.6), len * 0.7, w * 0.6, d - 1);
  };
  for (let i = 0; i < 4; i++) limb(65, 100 - i * 14, rnd(0.4, 2.7), rnd(20, 34), 4, 3);
  if (leafy) {
    for (let i = 0; i < 26; i++) {
      const x = 64 + rnd(-52, 52), y = rnd(10, 96);
      const rx = rnd(4, 11), ry = rx * rnd(0.4, 0.7);
      g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

/** A horizontal overhanging branch for framing the top of the view. */
export function branchTex(b: Bag): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round';
  const seg = (x0: number, y0: number, x1: number, y1: number, w: number, d: number) => {
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + rnd(-24, 24), (y0 + y1) / 2 - rnd(0, 16), x1, y1);
    g.stroke();
    if (d > 0 && w > 1.4) {
      for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) {
        const t = rnd(0.4, 0.9);
        const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
        seg(bx, by, bx + rnd(-40, 40), by - rnd(16, 56), w * 0.55, d - 1);
      }
    }
  };
  seg(6, 56, 250, 44, 7, 3);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 256, y = 20 + Math.random() * 74;
    const rx = rnd(3, 10), ry = rx * rnd(0.4, 0.7);
    g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

/** A standing figure silhouette (child / cloaked adult). */
export function figureTex(b: Bag, kind: 'girl' | 'witch' | 'adult'): THREE.Texture {
  const W = 128, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const cx = W / 2;
  g.fillStyle = 'rgba(10,14,26,0.94)';
  if (kind === 'girl') {
    const top = 64;
    g.beginPath(); g.arc(cx, top + 16, 15, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(cx - 16, top + 12);
    g.quadraticCurveTo(cx - 18, top + 34, cx - 12, top + 40);
    g.lineTo(cx + 12, top + 40);
    g.quadraticCurveTo(cx + 18, top + 34, cx + 16, top + 12);
    g.quadraticCurveTo(cx, top - 4, cx - 16, top + 12);
    g.fill();
    g.beginPath();
    g.moveTo(cx - 10, top + 40); g.lineTo(cx + 10, top + 40);
    g.lineTo(cx + 12, top + 96); g.lineTo(cx - 12, top + 96); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(cx - 12, top + 92); g.lineTo(cx + 12, top + 92);
    g.quadraticCurveTo(cx + 21, top + 130, cx + 18, top + 152);
    g.quadraticCurveTo(cx, top + 160, cx - 18, top + 152);
    g.quadraticCurveTo(cx - 21, top + 130, cx - 12, top + 92);
    g.fill();
    g.fillRect(cx - 8, top + 152, 6, 26);
    g.fillRect(cx + 2, top + 152, 6, 26);
  } else if (kind === 'witch') {
    g.beginPath();
    g.moveTo(cx, 6); g.lineTo(cx + 26, 58); g.lineTo(cx - 26, 58); g.closePath(); g.fill();
    g.fillRect(cx - 34, 56, 68, 8);
    g.beginPath(); g.arc(cx, 74, 12, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(cx - 14, 84); g.lineTo(cx + 14, 84);
    g.lineTo(cx + 32, 246);
    g.quadraticCurveTo(cx, 256, cx - 30, 246);
    g.closePath(); g.fill();
  } else {
    // adult woman, long hair, long dress
    g.beginPath(); g.arc(cx, 40, 13, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(cx - 14, 34); g.quadraticCurveTo(cx - 20, 90, cx - 12, 116);
    g.lineTo(cx + 12, 116); g.quadraticCurveTo(cx + 20, 90, cx + 14, 34);
    g.quadraticCurveTo(cx, 18, cx - 14, 34); g.fill();
    g.beginPath();
    g.moveTo(cx - 11, 56); g.lineTo(cx + 11, 56);
    g.quadraticCurveTo(cx + 26, 170, cx + 22, 248);
    g.quadraticCurveTo(cx, 256, cx - 22, 248);
    g.quadraticCurveTo(cx - 26, 170, cx - 11, 56);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

// ── object builders ────────────────────────────────────────────

/** The moon: body + halo + core glow, optionally tinting toward violet. */
export function addMoon(
  b: Bag, group: THREE.Group,
  o: { pos: THREE.Vector3; size?: number; channel: string; violetChannel?: string; haloScale?: number },
): Layer {
  const size = o.size ?? 0.16;
  const haloMat = b.M(new THREE.SpriteMaterial({ map: radialTex(b, 'rgba(200,220,250,0.9)'), color: 0xcfe0f6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const halo = new THREE.Sprite(haloMat);
  const hs = size * (o.haloScale ?? 2.6);
  halo.scale.set(hs, hs, 1);
  halo.position.copy(o.pos).setZ(o.pos.z - 0.012);
  group.add(halo);

  const discMat = b.M(new THREE.SpriteMaterial({ map: moonTex(b), transparent: true, opacity: 0, depthWrite: false })) as THREE.SpriteMaterial;
  const disc = new THREE.Sprite(discMat);
  disc.scale.set(size, size, 1);
  disc.position.copy(o.pos);
  group.add(disc);

  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const v = L(levels, o.violetChannel);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.5);
      discMat.color.setHSL(0.62 - v * 0.14, 0.34 + v * 0.26, 0.88 - v * 0.06);
      discMat.opacity = master * on * 0.9;
      haloMat.color.setHSL(0.62 - v * 0.12, 0.45, 0.8);
      haloMat.opacity = master * on * (0.1 + 0.06 * pulse + v * 0.05);
      disc.scale.setScalar(size * (1 + 0.03 * Math.sin(elapsed * 0.6)));
      disc.position.y = o.pos.y + on * 0.004 * Math.sin(elapsed * 0.4);
    },
  };
}

/** A soft light shaft descending from a point (moonbeam / god ray). */
export function addShaft(
  b: Bag, group: THREE.Group,
  o: { x: number; y?: number; z?: number; w?: number; h?: number; channel: string; color?: string; rot?: number },
): Layer {
  const mat = b.M(new THREE.MeshBasicMaterial({ map: shaftTex(b, o.color ?? 'rgba(206,222,246,0.6)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const mesh = new THREE.Mesh(b.G(new THREE.PlaneGeometry(o.w ?? 0.26, o.h ?? PAGE_ASPECT * 0.95)), mat);
  mesh.position.set(o.x, o.y ?? 0, o.z ?? 0.05);
  mesh.rotation.z = o.rot ?? 0;
  group.add(mesh);
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      mat.opacity = master * on * (0.05 + 0.045 * (0.5 + 0.5 * Math.sin(elapsed * 0.32)));
      mesh.scale.x = 1 + 0.07 * Math.sin(elapsed * 0.4);
    },
  };
}

/**
 * A depth field of trees: many silhouettes spread across x at several z bands,
 * so the forest gains real parallax. Uses one instanced mesh per band.
 */
export function addTreeField(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; bands?: number; color?: number; leafy?: boolean; yBase?: number; spread?: number },
): Layer {
  const tex = treeTex(b, o.leafy ?? true);
  const bands = o.bands ?? 3;
  const spread = o.spread ?? 1.5; // wider than the page → forest continues past the edge
  const insts: Array<{ mesh: THREE.InstancedMesh; base: Float32Array; n: number; z: number }> = [];
  const m4 = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const pv = new THREE.Vector3();
  const sv = new THREE.Vector3();

  for (let band = 0; band < bands; band++) {
    const depth = band / Math.max(1, bands - 1);      // 0 = far, 1 = near
    const n = q(o.quality, 6 - band, 4 - band) + 3;   // near bands: fewer, larger
    const z = 0.02 + depth * 0.22;
    const geo = b.G(new THREE.PlaneGeometry(1, 1));
    const mat = b.M(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
      color: o.color ?? (0x0a1020 + band * 0x020408),
    }));
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const base = new Float32Array(n * 4); // x, y, w, h
    for (let i = 0; i < n; i++) {
      const h = (0.18 + depth * 0.34) * rnd(0.75, 1.35);
      const w = h * rnd(0.42, 0.62);
      // The forest FRAMES the page; it must not bury the artwork. Trees start at
      // the paper's edge (|x| ≥ 0.42) and continue outward into the room, so the
      // printed scene stays fully readable between them.
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * rnd(0.42, Math.max(0.6, spread * 0.62));
      const y = (o.yBase ?? -HALF_H) + h * 0.5 - 0.02;
      base[i * 4] = x; base[i * 4 + 1] = y; base[i * 4 + 2] = w; base[i * 4 + 3] = h;
    }
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(inst);
    insts.push({ mesh: inst, base, n, z });
    // seed matrices
    for (let i = 0; i < n; i++) {
      pv.set(base[i * 4], base[i * 4 + 1], z);
      sv.set(base[i * 4 + 2], base[i * 4 + 3], 1);
      m4.compose(pv, qt, sv);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      for (let bi = 0; bi < insts.length; bi++) {
        const it = insts[bi];
        (it.mesh.material as THREE.MeshBasicMaterial).opacity = master * on * (0.95 - bi * 0.06);
        for (let i = 0; i < it.n; i++) {
          const h = it.base[i * 4 + 3] * (0.45 + on * 0.55); // they rise as the beat lands
          pv.set(
            it.base[i * 4] + Math.sin(elapsed * 0.12 + i + bi) * 0.004,
            (it.base[i * 4 + 1] - it.base[i * 4 + 3] * 0.5) + h * 0.5,
            it.z,
          );
          sv.set(it.base[i * 4 + 2], h, 1);
          m4.compose(pv, qt, sv);
          it.mesh.setMatrixAt(i, m4);
        }
        it.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** Branches overhanging the top edge, reaching into the room. */
export function addCanopy(
  b: Bag, group: THREE.Group,
  o: { channel: string; count?: number; color?: number },
): Layer {
  const tex = branchTex(b);
  const n = o.count ?? 3;
  const items: Array<{ m: THREE.Mesh; x: number; y: number; z: number; rot: number }> = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const w = rnd(0.6, 0.85), h = w * 0.55;
    const mat = b.M(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: o.color ?? 0x0a1020 }));
    const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(w * side, h)), mat);
    // hung above the paper's top edge and out toward the corners: they frame the
    // view from above without crossing the printed art
    const x = side * rnd(0.42, 0.62);
    const y = HALF_H + rnd(0.18, 0.3);
    const z = 0.24 + i * 0.05;
    const rot = side * rnd(0.24, 0.42);
    m.position.set(x, y, z); m.rotation.z = rot;
    group.add(m);
    items.push({ m, x, y, z, rot });
  }
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      items.forEach((it, i) => {
        (it.m.material as THREE.MeshBasicMaterial).opacity = master * on * 0.7;
        it.m.position.z = it.z + on * 0.06;
        it.m.position.y = it.y - on * 0.03;
        it.m.rotation.z = it.rot + Math.sin(elapsed * 0.24 + i) * 0.02 * on;
      });
    },
  };
}

/** A bank of low mist that can widen past the page edges. */
export function addMist(
  b: Bag, group: THREE.Group,
  o: { channel: string; overflowChannel?: string; quality: Quality; y?: number; layers?: number; width?: number; color?: string; height?: number },
): Layer {
  const tex = radialTex(b, o.color ?? 'rgba(200,214,240,0.5)');
  const n = o.layers ?? q(o.quality, 5, 3);
  const items: Array<{ m: THREE.Mesh; x: number }> = [];
  for (let i = 0; i < n; i++) {
    const mat = b.M(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(o.width ?? 1.0, o.height ?? 0.24)), mat);
    const x = (i - (n - 1) / 2) * 0.16;
    m.position.set(x, (o.y ?? -HALF_H) + 0.03 + i * 0.026, 0.012 + i * 0.018);
    group.add(m);
    items.push({ m, x });
  }
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const over = L(levels, o.overflowChannel);
      items.forEach((it, i) => {
        (it.m.material as THREE.MeshBasicMaterial).opacity = master * on * (0.07 + 0.045 * (0.5 + 0.5 * Math.sin(elapsed * 0.4 + i)));
        it.m.scale.x = 1 + over * 0.6;
        it.m.position.x = it.x + Math.sin(elapsed * (0.05 + i * 0.017)) * 0.055;
      });
    },
  };
}

/** Warm fireflies that can gather in a direction and drift past the page. */
export function addFireflies(
  b: Bag, group: THREE.Group,
  o: { channel: string; gatherChannel?: string; quality: Quality; n?: number; color?: number; size?: number; spread?: number },
): Layer {
  const n = o.n ?? q(o.quality, 26, 14);
  const tex = radialTex(b, 'rgba(255,236,180,1)');
  const pos = new Float32Array(n * 3);
  const home: number[] = [];
  const goal: number[] = [];
  const spread = o.spread ?? 0.8;
  for (let i = 0; i < n; i++) {
    const x = rnd(-spread / 2, spread / 2);
    const y = -HALF_H + rnd(0.03, PAGE_ASPECT * 0.75);
    const z = 0.02 + Math.random() * 0.28;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    home.push(x, y, z);
    goal.push(x * 1.85, y + rnd(0.02, 0.12), z + rnd(0.02, 0.1)); // outward, off the paper
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({ map: tex, color: o.color ?? 0xffe6a6, size: o.size ?? 0.04, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(geo, mat));
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const out = L(levels, o.gatherChannel);
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        arr[i * 3] = home[i * 3] + (goal[i * 3] - home[i * 3]) * out + Math.sin(elapsed * 0.5 + i) * 0.026;
        arr[i * 3 + 1] = home[i * 3 + 1] + (goal[i * 3 + 1] - home[i * 3 + 1]) * on + Math.sin(elapsed * 0.7 + i * 1.3) * 0.02;
        arr[i * 3 + 2] = home[i * 3 + 2] + (goal[i * 3 + 2] - home[i * 3 + 2]) * out;
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = master * on * (0.5 + 0.42 * Math.abs(Math.sin(elapsed * 1.4)));
    },
  };
}

/** Rising motes: memory particles, gold dust, embers. */
export function addMotes(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number; color?: number; hue?: string; size?: number; rise?: number; spread?: number; yFrom?: number },
): Layer {
  const n = o.n ?? q(o.quality, 34, 18);
  const tex = radialTex(b, o.hue ?? 'rgba(178,140,228,1)');
  const pos = new Float32Array(n * 3);
  const home: number[] = [];
  const seed: number[] = [];
  const spread = o.spread ?? 1.05;
  for (let i = 0; i < n; i++) {
    const x = rnd(-spread / 2, spread / 2);
    const y = (o.yFrom ?? -HALF_H) + Math.random() * PAGE_ASPECT;
    const z = 0.02 + Math.random() * 0.24;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    home.push(x, y, z); seed.push(Math.random() * 10);
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({ map: tex, color: o.color ?? 0xb28ce4, size: o.size ?? 0.028, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(geo, mat));
  const rise = o.rise ?? 0.4;
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        arr[i * 3 + 1] = home[i * 3 + 1] + ((elapsed * 0.05 + seed[i]) % rise);
        arr[i * 3] = home[i * 3] + Math.sin(elapsed * 0.5 + seed[i]) * 0.012;
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = master * on * 0.55;
    },
  };
}

/** A cloud of drifting sparks that converge on, or scatter from, a point. */
export function addSparkStream(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; from: THREE.Vector3; to: THREE.Vector3; hue: string; color: number; n?: number; size?: number; reachChannel?: string },
): Layer {
  const n = o.n ?? q(o.quality, 26, 14);
  const tex = radialTex(b, o.hue);
  const pos = new Float32Array(n * 3);
  const home: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = o.from.x + rnd(-0.05, 0.05);
    const y = o.from.y + rnd(-0.06, 0.08);
    const z = o.from.z + rnd(0, 0.08);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    home.push(x, y, z); seed.push(Math.random());
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({ map: tex, color: o.color, size: o.size ?? 0.03, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(geo, mat));
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const reach = o.reachChannel ? L(levels, o.reachChannel) : 1;
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        const t = ((elapsed * 0.16 + seed[i]) % 1) * reach;
        arr[i * 3] = home[i * 3] + (o.to.x - home[i * 3]) * t + Math.sin(elapsed + seed[i] * 9) * 0.005;
        arr[i * 3 + 1] = home[i * 3 + 1] + (o.to.y - home[i * 3 + 1]) * t + Math.sin(elapsed * 1.3 + i) * 0.008;
        arr[i * 3 + 2] = home[i * 3 + 2] + (o.to.z - home[i * 3 + 2]) * t;
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = master * on * (0.45 + 0.3 * Math.sin(elapsed * 0.8));
    },
  };
}

/** Flowing ribbons (memory, nightmare tendrils, light veils). */
export function addRibbons(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number; color: number; hue: string; y?: number; amp?: number; z?: number; width?: number; dark?: boolean },
): Layer {
  const n = o.n ?? q(o.quality, 4, 2);
  const tex = shaftTex(b, o.hue);
  const items: Array<{ m: THREE.Mesh; y: number; rot: number; sp: number; phase: number }> = [];
  for (let i = 0; i < n; i++) {
    const mat = b.M(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
      blending: o.dark ? THREE.NormalBlending : THREE.AdditiveBlending, color: o.color,
    }));
    const w = o.width ?? rnd(0.5, 0.9);
    const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(w, rnd(0.05, 0.11))), mat);
    const y = (o.y ?? 0) + rnd(-0.12, 0.12);
    const rot = rnd(-0.5, 0.5);
    m.position.set(rnd(-0.25, 0.25), y, (o.z ?? 0.08) + i * 0.02);
    m.rotation.z = rot;
    group.add(m);
    items.push({ m, y, rot, sp: rnd(0.15, 0.4), phase: rnd(0, 6.28) });
  }
  const amp = o.amp ?? 0.05;
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      items.forEach((it, i) => {
        (it.m.material as THREE.MeshBasicMaterial).opacity = master * on * (o.dark ? 0.5 : 0.16) * (0.6 + 0.4 * Math.sin(elapsed * 0.6 + i));
        it.m.position.y = it.y + Math.sin(elapsed * it.sp + it.phase) * amp;
        it.m.rotation.z = it.rot + Math.sin(elapsed * it.sp * 0.7 + it.phase) * 0.14;
        it.m.scale.x = 0.7 + on * 0.4;
      });
    },
  };
}

/** A presence: a soft aura standing for a character without modelling them. */
export function addAura(
  b: Bag, group: THREE.Group,
  o: { channel: string; x: number; y?: number; z?: number; w?: number; h?: number; hue: string; color: number; strength?: number },
): Layer {
  const mat = b.M(new THREE.SpriteMaterial({ map: radialTex(b, o.hue), color: o.color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const s = new THREE.Sprite(mat);
  const w = o.w ?? 0.22, h = o.h ?? 0.36;
  s.scale.set(w, h, 1);
  s.position.set(o.x, o.y ?? -0.02, o.z ?? 0.08);
  group.add(s);
  const k = o.strength ?? 0.2;
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      mat.opacity = master * on * k * (0.7 + 0.4 * Math.sin(elapsed * 0.6));
      s.scale.set(w * (1 + on * 0.14), h * (1 + on * 0.16), 1);
    },
  };
}

/** A 2.5-D figure silhouette standing on the page (never a 3-D model). */
export function addFigure(
  b: Bag, group: THREE.Group,
  o: { channel: string; kind: 'girl' | 'witch' | 'adult'; x: number; y?: number; z?: number; h?: number; rim?: number },
): Layer {
  const tex = figureTex(b, o.kind);
  const h = o.h ?? 0.2;
  const w = h * 0.5;
  const mat = b.M(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })) as THREE.SpriteMaterial;
  const s = new THREE.Sprite(mat);
  s.scale.set(w, h, 1);
  const y = o.y ?? (-HALF_H + h * 0.5);
  s.position.set(o.x, y, o.z ?? 0.1);
  group.add(s);
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      mat.opacity = master * on * 0.85;
      s.position.y = y + Math.sin(elapsed * 0.7) * 0.003 * on;
    },
  };
}

/** A crowd of half-seen figures (the memories that surround her). */
export function addCrowd(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number; hue?: string; color?: number },
): Layer {
  const n = o.n ?? q(o.quality, 8, 5);
  const tex = radialTex(b, o.hue ?? 'rgba(168,140,224,0.85)');
  const items: Array<{ s: THREE.Sprite; m: THREE.SpriteMaterial; x: number; h: number; ph: number }> = [];
  for (let i = 0; i < n; i++) {
    const m = b.M(new THREE.SpriteMaterial({ map: tex, color: o.color ?? 0xa88ce0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
    const s = new THREE.Sprite(m);
    const h = rnd(0.14, 0.28);
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * rnd(0.14, 0.62);
    s.scale.set(h * 0.5, h, 1);
    s.position.set(x, -HALF_H + h * 0.45, 0.05 + (i % 4) * 0.045);
    group.add(s);
    items.push({ s, m, x, h, ph: rnd(0, 6.28) });
  }
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      items.forEach((it) => {
        it.m.opacity = master * on * 0.16 * (0.5 + 0.5 * Math.sin(elapsed * 0.5 + it.ph));
        it.s.position.x = it.x + Math.sin(elapsed * 0.2 + it.ph) * 0.012;
      });
    },
  };
}

/** Vertical threads of light rising from the ground (release / freeing). */
export function addLightThreads(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number; hue?: string; color?: number },
): Layer {
  const n = o.n ?? q(o.quality, 6, 3);
  const tex = shaftTex(b, o.hue ?? 'rgba(226,236,255,0.8)');
  const items: Array<{ m: THREE.Mesh; x: number; ph: number }> = [];
  for (let i = 0; i < n; i++) {
    const mat = b.M(new THREE.MeshBasicMaterial({ map: tex, color: o.color ?? 0xdfeaff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(rnd(0.02, 0.05), rnd(0.3, 0.52))), mat);
    const x = rnd(-0.55, 0.55);
    m.position.set(x, rnd(-0.04, 0.1), 0.06 + i * 0.02);
    group.add(m);
    items.push({ m, x, ph: rnd(0, 6.28) });
  }
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      items.forEach((it) => {
        (it.m.material as THREE.MeshBasicMaterial).opacity = master * on * 0.2 * (0.5 + 0.5 * Math.sin(elapsed * 0.7 + it.ph));
        it.m.scale.y = 0.5 + on * 0.6;
        it.m.position.x = it.x + Math.sin(elapsed * 0.25 + it.ph) * 0.02;
      });
    },
  };
}

/** Concentric halo rings around a point (memory layers / the witch's aura). */
export function addRings(
  b: Bag, group: THREE.Group,
  o: { channel: string; pos: THREE.Vector3; n?: number; hue?: string; color?: number; base?: number },
): Layer {
  const n = o.n ?? 3;
  const items: Array<{ s: THREE.Sprite; m: THREE.SpriteMaterial }> = [];
  for (let i = 0; i < n; i++) {
    const m = b.M(new THREE.SpriteMaterial({ map: ringTex(b, o.hue ?? 'rgba(176,140,226,0.85)'), color: o.color ?? 0xb08ce2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
    const s = new THREE.Sprite(m);
    s.position.copy(o.pos).setZ(o.pos.z - 0.006);
    group.add(s);
    items.push({ s, m });
  }
  const base = o.base ?? 0.3;
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      items.forEach((r, i) => {
        const local = Math.max(0, Math.min(1, on * 1.4 - i * 0.3));
        const sc = base + i * 0.16 + local * 0.1 + 0.015 * Math.sin(elapsed * 0.5 + i);
        r.s.scale.set(sc, sc, 1);
        r.m.opacity = master * local * (0.17 - i * 0.04);
      });
    },
  };
}

/** A broad wash that spreads outward — colour soaking into the whole space. */
export function addWash(
  b: Bag, group: THREE.Group,
  o: { channel: string; pos?: THREE.Vector3; hue: string; color: number; max?: number; strength?: number },
): Layer {
  const mat = b.M(new THREE.SpriteMaterial({ map: radialTex(b, o.hue), color: o.color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const s = new THREE.Sprite(mat);
  s.position.copy(o.pos ?? new THREE.Vector3(0, 0, 0.03));
  group.add(s);
  return {
    update(_e, levels, master) {
      const on = L(levels, o.channel);
      const sc = 0.36 + on * (o.max ?? 0.55);
      s.scale.set(sc, sc, 1);
      mat.opacity = master * on * (o.strength ?? 0.13);
    },
  };
}

/** A shadow cast forward off the page onto the table — presence in the room. */
export function addForwardShadow(
  b: Bag, group: THREE.Group,
  o: { channel: string; x: number; w?: number; h?: number },
): Layer {
  const mat = b.M(new THREE.MeshBasicMaterial({ map: radialTex(b, 'rgba(0,0,0,0.85)'), transparent: true, opacity: 0, depthWrite: false }));
  const m = new THREE.Mesh(b.G(new THREE.PlaneGeometry(o.w ?? 0.3, o.h ?? 0.44)), mat);
  m.position.set(o.x, -HALF_H - (o.h ?? 0.44) * 0.32, 0.002);
  group.add(m);
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      mat.opacity = master * on * (0.2 + 0.04 * Math.sin(elapsed * 0.5));
    },
  };
}

/** Faint stars for night skies. */
export function addStars(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number },
): Layer {
  const n = o.n ?? q(o.quality, 60, 30);
  const tex = radialTex(b, 'rgba(226,236,250,1)');
  const pos = new Float32Array(n * 3);
  const seed: number[] = [];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd(-0.6, 0.6);
    pos[i * 3 + 1] = rnd(-0.05, HALF_H + 0.16);
    pos[i * 3 + 2] = 0.01 + Math.random() * 0.06;
    seed.push(Math.random() * 6.28);
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({ map: tex, color: 0xe2ecfa, size: 0.012, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(geo, mat));
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      mat.opacity = master * on * (0.35 + 0.2 * Math.sin(elapsed * 0.6));
    },
  };
}

/** Dark restless tendrils — the nightmare, drawn with normal blending so it bites. */
export function addTendrils(
  b: Bag, group: THREE.Group,
  o: { channel: string; quality: Quality; n?: number },
): Layer {
  return addRibbons(b, group, {
    channel: o.channel, quality: o.quality, n: o.n ?? q(o.quality, 5, 3),
    color: 0x141024, hue: 'rgba(20,16,36,0.85)', y: 0.02, amp: 0.07, width: 0.95, dark: true,
  });
}

/** Compose a scene from layers. */
export function composeScene(group: THREE.Group, bag: Bag, layers: Layer[]) {
  return {
    group,
    apply: (elapsed: number, _dt: number, levels: Readonly<Record<string, number>>, master: number) => {
      for (const l of layers) l.update(elapsed, levels, master);
    },
    dispose: () => bag.dispose(group),
  };
}

/** A blade-of-grass silhouette, drawn once and instanced across the ground. */
function grassTex(b: Bag): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  for (let i = 0; i < 5; i++) {
    const x0 = 4 + i * 6 + rnd(-1.5, 1.5);
    const h = rnd(30, 60);
    const bend = rnd(-7, 7);
    g.beginPath();
    g.moveTo(x0, 64);
    g.quadraticCurveTo(x0 + bend * 0.5, 64 - h * 0.55, x0 + bend, 64 - h);
    g.quadraticCurveTo(x0 + bend * 0.5 + 1.6, 64 - h * 0.55, x0 + 1.8, 64);
    g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return b.T(t);
}

/**
 * The ground as a living surface rather than a dark plane.
 *
 * Instanced grass tufts stand up off the paper at several depths and bend in a
 * travelling wind. They also part around a live point — her feet — so that when
 * she steps the ground answers, and they take on the story's colour when a
 * `tintChannel` rises, so the moon turning violet reaches all the way down here.
 */
export function addGround(
  b: Bag, group: THREE.Group,
  o: {
    channel: string; quality: Quality;
    /** live point the grass parts around (her feet) */
    partAround?: () => THREE.Vector3;
    /** how strongly it parts, 0..1 */
    partChannel?: string;
    /** colour bleed from the story (violet moon, magic) */
    tintChannel?: string;
    tint?: number;
    rows?: number; width?: number; yBase?: number;
  },
): Layer {
  const tex = grassTex(b);
  const rows = o.rows ?? q(o.quality, 4, 2);
  const width = o.width ?? 1.5;
  const base = o.yBase ?? -HALF_H;
  const clumps: Array<{ mesh: THREE.InstancedMesh; data: Float32Array; n: number; z: number; mat: THREE.MeshBasicMaterial }> = [];
  const m4 = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const pv = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const eu = new THREE.Euler();

  for (let r = 0; r < rows; r++) {
    const depth = r / Math.max(1, rows - 1);
    const n = q(o.quality, 22 - r * 3, 12 - r * 2);
    const z = 0.006 + depth * 0.05;
    const geo = b.G(new THREE.PlaneGeometry(1, 1));
    const mat = b.M(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
      color: new THREE.Color().setHSL(0.32, 0.3, 0.1 + depth * 0.05),
    }));
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const data = new Float32Array(n * 4); // x, y, w, h
    for (let i = 0; i < n; i++) {
      const h = (0.035 + depth * 0.05) * rnd(0.7, 1.45);
      const w = h * rnd(1.1, 1.8);
      const x = rnd(-width / 2, width / 2);
      const y = base + depth * 0.05 + h * 0.5 - 0.008;
      data[i * 4] = x; data[i * 4 + 1] = y; data[i * 4 + 2] = w; data[i * 4 + 3] = h;
    }
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(inst);
    clumps.push({ mesh: inst, data, n, z, mat });
  }

  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const part = L(levels, o.partChannel);
      const tint = L(levels, o.tintChannel);
      const at = o.partAround?.();
      for (let ci = 0; ci < clumps.length; ci++) {
        const c = clumps[ci];
        c.mat.opacity = master * on * (0.55 - ci * 0.06);
        if (tint > 0) c.mat.color.setHSL(0.32 - tint * 0.55, 0.3 + tint * 0.25, 0.1 + ci * 0.02 + tint * 0.06);
        for (let i = 0; i < c.n; i++) {
          const x = c.data[i * 4], y = c.data[i * 4 + 1];
          const w = c.data[i * 4 + 2], h = c.data[i * 4 + 3] * (0.3 + on * 0.7);
          // a wind that travels across the ground rather than everything waving together
          let lean = Math.sin(elapsed * 0.8 + x * 6 + ci) * 0.09;
          // and grass gets out of her way
          if (at && part > 0) {
            const d = Math.hypot(x - at.x, y - at.y);
            const push = Math.max(0, 1 - d / 0.16) * part;
            lean += Math.sign(x - at.x || 1) * push * 0.5;
          }
          eu.set(0, 0, lean);
          qt.setFromEuler(eu);
          pv.set(x, y - c.data[i * 4 + 3] * 0.5 + h * 0.5, c.z);
          sv.set(w, h, 1);
          m4.compose(pv, qt, sv);
          c.mesh.setMatrixAt(i, m4);
        }
        c.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
