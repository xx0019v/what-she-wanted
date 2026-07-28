// ────────────────────────────────────────────────────────────────
// Page scenes — procedural stages whose every element is driven by the story's
// phase channels, not by a global loop. A channel at 0 means "this beat has not
// happened yet"; the element is genuinely absent. That is what makes the page
// feel like it is telling a story rather than looping a screensaver.
//
// Anchor space: page width = 1 (x ∈ [-0.5, 0.5]); height = 0.5625 (y ∈ ±0.281);
// +z toward the viewer. Values beyond those bounds deliberately leave the paper.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { StoryScene } from './storyTypes';

export const PAGE_ASPECT = 1080 / 1920;
const HALF_H = PAGE_ASPECT * 0.5;

// ── shared procedural textures ─────────────────────────────────
function radial(color: string, mid?: number): THREE.Texture {
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
  return t;
}

function ring(color: string): THREE.Texture {
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
  return t;
}

function shaft(color: string): THREE.Texture {
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
  return t;
}

function moonFace(): THREE.Texture {
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
  return t;
}

function branchTex(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round';
  const limb = (x0: number, y0: number, x1: number, y1: number, w: number, d: number) => {
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0);
    const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 26;
    const my = (y0 + y1) / 2 - Math.random() * 16;
    g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    if (d > 0 && w > 1.4) {
      for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) {
        const t = 0.4 + Math.random() * 0.5;
        const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
        limb(bx, by, bx + (Math.random() - 0.5) * 80, by - 16 - Math.random() * 44, w * 0.55, d - 1);
      }
    }
  };
  limb(8, 58, 250, 44, 7, 3);
  for (let i = 0; i < 24; i++) {
    const x = Math.random() * 256, y = 22 + Math.random() * 70;
    const rx = 3 + Math.random() * 7, ry = rx * (0.4 + Math.random() * 0.3);
    g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/** Tracked-resource bag so every scene disposes completely. */
class Bag {
  tex: THREE.Texture[] = [];
  geo: THREE.BufferGeometry[] = [];
  mat: THREE.Material[] = [];
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

const L = (levels: Readonly<Record<string, number>>, k: string) => levels[k] ?? 0;

// ═══════════════════════════════════════════════════════════════
// PAGE 04 — THE FOREST AWAKENS AROUND HER
// channels: moonBreath · groundMist · fireflies · depth · branches · overflow · witchHint
// ═══════════════════════════════════════════════════════════════
export function createForestScene(opts: { quality: 'high' | 'low' }): StoryScene {
  const q = opts.quality;
  const group = new THREE.Group();
  const b = new Bag();

  // moon that lifts off the printed moon (channel: moonBreath)
  const moonPos = new THREE.Vector3(0, PAGE_ASPECT * 0.36, 0.16);
  const haloMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(200,220,250,0.9)')), color: 0xcfe0f6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(0.4, 0.4, 1); halo.position.copy(moonPos).setZ(moonPos.z - 0.01);
  group.add(halo);
  const discMat = b.M(new THREE.SpriteMaterial({ map: b.T(moonFace()), transparent: true, opacity: 0, depthWrite: false })) as THREE.SpriteMaterial;
  const disc = new THREE.Sprite(discMat);
  disc.scale.set(0.16, 0.16, 1); disc.position.copy(moonPos);
  group.add(disc);
  const beamMat = b.M(new THREE.MeshBasicMaterial({ map: b.T(shaft('rgba(206,222,246,0.6)')), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const beam = new THREE.Mesh(b.G(new THREE.PlaneGeometry(0.3, PAGE_ASPECT * 0.95)), beamMat);
  beam.position.set(0, PAGE_ASPECT * 0.03, 0.06);
  group.add(beam);

  // ground mist — widens past the page edges as `overflow` rises
  const mistTex = b.T(radial('rgba(200,214,240,0.5)'));
  const mist: THREE.Mesh[] = [];
  const mistLayers = q === 'low' ? 3 : 4;
  for (let i = 0; i < mistLayers; i++) {
    const m = new THREE.Mesh(
      b.G(new THREE.PlaneGeometry(1.0, 0.24)),
      b.M(new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })),
    );
    m.position.set((i - 1.5) * 0.14, -HALF_H + 0.03 + i * 0.028, 0.012 + i * 0.02);
    group.add(m); mist.push(m);
  }

  // fireflies — drift toward the girl's direction of travel as they appear
  const flyN = q === 'low' ? 12 : 20;
  const flyTex = b.T(radial('rgba(255,236,180,1)'));
  const flyPos = new Float32Array(flyN * 3);
  const flyHome: number[] = [];
  const flyGoal: number[] = [];
  for (let i = 0; i < flyN; i++) {
    const hx = (Math.random() - 0.5) * 0.7;
    const hy = -HALF_H + 0.05 + Math.random() * PAGE_ASPECT * 0.5;
    const hz = 0.02 + Math.random() * 0.26;
    flyPos[i * 3] = hx; flyPos[i * 3 + 1] = hy; flyPos[i * 3 + 2] = hz;
    flyHome.push(hx, hy, hz);
    // they gather ahead of her and, later, past the paper's edge
    flyGoal.push(hx * 1.7, hy + 0.06, hz + 0.08);
  }
  const flyGeo = b.G(new THREE.BufferGeometry());
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = b.M(new THREE.PointsMaterial({ map: flyTex, color: 0xffe6a6, size: 0.042, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(flyGeo, flyMat));

  // mid + far trees rise (channel: depth) — silhouettes at distinct z
  const treeTex = b.T(branchTex());
  const trees: THREE.Mesh[] = [];
  const treeSpec = [
    { x: -0.36, y: 0.02, z: 0.05, s: 0.34, rot: 0.06 },
    { x: 0.33, y: 0.03, z: 0.07, s: 0.38, rot: -0.05 },
    { x: -0.14, y: 0.0, z: 0.03, s: 0.26, rot: 0.02 },
    { x: 0.16, y: 0.01, z: 0.04, s: 0.28, rot: -0.03 },
  ];
  for (const s of treeSpec) {
    const m = new THREE.Mesh(
      b.G(new THREE.PlaneGeometry(s.s, s.s * 0.8)),
      b.M(new THREE.MeshBasicMaterial({ map: treeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x070b14 })),
    );
    m.position.set(s.x, s.y, s.z); m.rotation.z = s.rot;
    group.add(m); trees.push(m);
  }

  // Foreground branches overhang the TOP edge only — they frame the view from
  // above and reach into the room, but never cross the printed art.
  const fgBranches: THREE.Mesh[] = [];
  for (const s of [
    { x: -0.44, y: HALF_H + 0.2, z: 0.26, rot: -0.34, w: 0.7, h: 0.42, flip: 1 },
    { x: 0.48, y: HALF_H + 0.24, z: 0.3, rot: 0.34, w: 0.78, h: 0.44, flip: -1 },
  ]) {
    const m = new THREE.Mesh(
      b.G(new THREE.PlaneGeometry(s.w * s.flip, s.h)),
      b.M(new THREE.MeshBasicMaterial({ map: treeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x0a1020 })),
    );
    m.position.set(s.x, s.y, s.z); m.rotation.z = s.rot;
    group.add(m); fgBranches.push(m);
  }

  // the girl's presence: aura + a shadow reaching forward off the page
  const auraMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(190,208,242,0.8)')), color: 0xbcd0f0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(0.3, 0.3, 1); aura.position.set(-0.02, -HALF_H + 0.17, 0.03);
  group.add(aura);
  const shadowMat = b.M(new THREE.MeshBasicMaterial({ map: b.T(radial('rgba(0,0,0,0.85)')), transparent: true, opacity: 0, depthWrite: false }));
  const shadow = new THREE.Mesh(b.G(new THREE.PlaneGeometry(0.32, 0.46)), shadowMat);
  shadow.position.set(-0.02, -HALF_H - 0.14, 0.002);
  group.add(shadow);

  // the witch, only hinted, once (channel: witchHint, non-sustained)
  const hintMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(158,124,216,0.9)')), color: 0x9a7cd8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const hint = new THREE.Sprite(hintMat);
  hint.scale.set(0.22, 0.36, 1); hint.position.set(0.35, -0.01, 0.1);
  group.add(hint);

  return {
    group,
    apply(elapsed, _dt, levels, master) {
      const breath = L(levels, 'moonBreath');
      const mistL = L(levels, 'groundMist');
      const fly = L(levels, 'fireflies');
      const depth = L(levels, 'depth');
      const br = L(levels, 'branches');
      const over = L(levels, 'overflow');
      const witch = L(levels, 'witchHint');
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.5);

      discMat.opacity = master * breath * 0.9;
      haloMat.opacity = master * breath * (0.1 + 0.06 * pulse);
      disc.position.y = moonPos.y + breath * 0.004 * Math.sin(elapsed * 0.4);
      beamMat.opacity = master * breath * (0.04 + 0.035 * (0.5 + 0.5 * Math.sin(elapsed * 0.32)));

      mist.forEach((m, i) => {
        (m.material as THREE.MeshBasicMaterial).opacity = master * mistL * (0.08 + 0.045 * (0.5 + 0.5 * Math.sin(elapsed * 0.4 + i)));
        // mist creeps past the page's sides only once `overflow` opens
        m.scale.x = 1 + over * 0.55;
        m.position.x = (i - 1.5) * 0.14 + Math.sin(elapsed * (0.05 + i * 0.02)) * 0.05 * mistL;
      });

      const fa = (flyGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < flyN; i++) {
        const gx = flyHome[i * 3] + (flyGoal[i * 3] - flyHome[i * 3]) * over;
        const gy = flyHome[i * 3 + 1] + (flyGoal[i * 3 + 1] - flyHome[i * 3 + 1]) * fly;
        fa[i * 3] = gx + Math.sin(elapsed * 0.5 + i) * 0.028;
        fa[i * 3 + 1] = gy + Math.sin(elapsed * 0.7 + i * 1.3) * 0.02;
        fa[i * 3 + 2] = flyHome[i * 3 + 2];
      }
      (flyGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      flyMat.opacity = master * fly * (0.55 + 0.4 * Math.abs(Math.sin(elapsed * 1.4)));

      trees.forEach((m, i) => {
        (m.material as THREE.MeshBasicMaterial).opacity = master * depth * 0.9;
        // they grow up out of the paper as depth builds
        m.scale.y = 0.6 + depth * 0.4;
        m.position.y = treeSpec[i].y - (1 - depth) * 0.05;
      });

      fgBranches.forEach((m, i) => {
        (m.material as THREE.MeshBasicMaterial).opacity = master * br * 0.72;
        // they lean further into the room as the branch beat lands
        m.position.z = 0.26 + i * 0.04 + br * 0.06;
        m.position.y = HALF_H + (i === 0 ? 0.2 : 0.24) - br * 0.03;
        m.rotation.z = (i === 0 ? -0.34 : 0.34) + Math.sin(elapsed * 0.25) * 0.02 * br;
      });

      auraMat.opacity = master * Math.max(mistL, fly) * (0.1 + 0.05 * (0.5 + 0.5 * Math.sin(elapsed * 0.7)));
      shadowMat.opacity = master * depth * (0.2 + 0.04 * Math.sin(elapsed * 0.5));
      hintMat.opacity = master * witch * 0.24;
      hint.position.x = 0.35 + Math.sin(elapsed * 0.2) * 0.015;
    },
    dispose() { b.dispose(group); },
  };
}

// ═══════════════════════════════════════════════════════════════
// PAGE 05 — THE SPACE BETWEEN THEM BECOMES A PROMISE
// channels: hush · blueSide · violetSide · memoryGather · staffLight · tension
// ═══════════════════════════════════════════════════════════════
export function createContractScene(opts: { quality: 'high' | 'low' }): StoryScene {
  const q = opts.quality;
  const group = new THREE.Group();
  const b = new Bag();
  const GIRL_X = -0.16, WITCH_X = 0.24;
  const MID = new THREE.Vector3(0.03, 0.0, 0.07);

  // her side: a cool light that belongs to the child
  const blueMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(150,190,244,0.9)')), color: 0x9ec2f4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const blue = new THREE.Sprite(blueMat);
  blue.scale.set(0.2, 0.3, 1); blue.position.set(GIRL_X, -0.02, 0.06);
  group.add(blue);

  // the witch's side: violet, taller, patient
  const violetMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(176,132,224,0.9)')), color: 0xb084e0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const violet = new THREE.Sprite(violetMat);
  violet.scale.set(0.24, 0.42, 1); violet.position.set(WITCH_X, 0.0, 0.06);
  group.add(violet);

  // two streams of memory that converge but never fully merge
  const mk = (side: 'blue' | 'violet') => {
    const n = q === 'low' ? 16 : 26;
    const sx = side === 'blue' ? GIRL_X : WITCH_X;
    const tex = b.T(radial(side === 'blue' ? 'rgba(150,190,244,1)' : 'rgba(176,132,224,1)'));
    const pos = new Float32Array(n * 3);
    const seed: number[] = [];
    const home: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = sx + (Math.random() - 0.5) * 0.05;
      const y = -0.05 + Math.random() * 0.13;
      const z = 0.04 + Math.random() * 0.1;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      home.push(x, y, z); seed.push(Math.random());
    }
    const geo = b.G(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = b.M(new THREE.PointsMaterial({ map: tex, color: side === 'blue' ? 0x9ec2f4 : 0xb084e0, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(new THREE.Points(geo, mat));
    return { n, geo, mat, seed, home, side };
  };
  const streams = [mk('blue'), mk('violet')];

  // the promise itself: a soft bloom held in the gap (never a magic circle)
  const bloomMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(168,128,220,0.9)')), color: 0xa884dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const bloom = new THREE.Sprite(bloomMat);
  bloom.scale.set(0.2, 0.2, 1); bloom.position.copy(MID);
  group.add(bloom);

  // a thin light climbing the staff
  const staffMat = b.M(new THREE.MeshBasicMaterial({ map: b.T(shaft('rgba(190,160,236,0.85)')), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const staff = new THREE.Mesh(b.G(new THREE.PlaneGeometry(0.07, PAGE_ASPECT * 0.72)), staffMat);
  staff.position.set(WITCH_X + 0.05, 0.02, 0.05);
  group.add(staff);

  return {
    group,
    apply(elapsed, _dt, levels, master) {
      const hush = L(levels, 'hush');
      const bl = L(levels, 'blueSide');
      const vi = L(levels, 'violetSide');
      const gather = L(levels, 'memoryGather');
      const st = L(levels, 'staffLight');
      const tension = L(levels, 'tension');

      // the hush is a held breath: during it, motion is suppressed almost to nil
      const breathing = 0.25 + 0.75 * (1 - hush * (1 - Math.min(1, bl + vi)));
      blueMat.opacity = master * bl * (0.16 + 0.07 * (0.5 + 0.5 * Math.sin(elapsed * 0.8)) * breathing);
      violetMat.opacity = master * vi * (0.16 + 0.07 * (0.5 + 0.5 * Math.sin(elapsed * 0.7 + 1.2)) * breathing);
      blue.scale.set(0.2 + bl * 0.03, 0.3 + bl * 0.04, 1);
      violet.scale.set(0.24 + vi * 0.03, 0.42 + vi * 0.05, 1);

      for (const s of streams) {
        const arr = (s.geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        const sideLevel = s.side === 'blue' ? bl : vi;
        for (let i = 0; i < s.n; i++) {
          // travel toward the middle in proportion to `gather`, but stop short:
          // the two colours meet without becoming one — the contract's tension
          const reach = gather * (0.82 - tension * 0.12);
          const t = ((elapsed * 0.16 + s.seed[i]) % 1) * reach;
          arr[i * 3] = s.home[i * 3] + (MID.x - s.home[i * 3]) * t + Math.sin(elapsed + s.seed[i] * 9) * 0.005;
          arr[i * 3 + 1] = s.home[i * 3 + 1] + (MID.y - s.home[i * 3 + 1]) * t + Math.sin(elapsed * 1.3 + i) * 0.008;
          arr[i * 3 + 2] = s.home[i * 3 + 2] + (MID.z - s.home[i * 3 + 2]) * t;
        }
        (s.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        s.mat.opacity = master * Math.min(sideLevel, 0.2 + gather) * (0.45 + 0.3 * Math.sin(elapsed * 0.8 + (s.side === 'blue' ? 0 : 1.6)));
      }

      bloomMat.opacity = master * gather * (0.08 + 0.1 * (0.5 + 0.5 * Math.sin(elapsed * 0.6)));
      bloom.scale.setScalar(0.18 + gather * 0.06 + 0.02 * Math.sin(elapsed * 0.5));
      staffMat.opacity = master * st * (0.12 + 0.09 * (0.5 + 0.5 * Math.sin(elapsed * 0.9)));
      staff.scale.y = 0.6 + st * 0.4;
    },
    dispose() { b.dispose(group); },
  };
}

// ═══════════════════════════════════════════════════════════════
// PAGE 11 — THE MOON REMEMBERS WHAT SHE FORGOT
// channels: blueMoon · violetSeep · propagate · memoryRings · stillness
// ═══════════════════════════════════════════════════════════════
export function createVioletMoonScene(opts: { quality: 'high' | 'low' }): StoryScene {
  const q = opts.quality;
  const group = new THREE.Group();
  const b = new Bag();
  const moonPos = new THREE.Vector3(0, PAGE_ASPECT * 0.06, 0.16);

  const discMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(240,246,255,1)')), color: 0xdfeaff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const disc = new THREE.Sprite(discMat);
  disc.scale.set(0.24, 0.24, 1); disc.position.copy(moonPos);
  group.add(disc);

  const haloMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(200,220,250,0.9)')), color: 0xcfe0f6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(0.6, 0.6, 1); halo.position.copy(moonPos).setZ(moonPos.z - 0.01);
  group.add(halo);

  const rings: Array<{ s: THREE.Sprite; m: THREE.SpriteMaterial }> = [];
  for (let i = 0; i < 3; i++) {
    const m = b.M(new THREE.SpriteMaterial({ map: b.T(ring('rgba(176,140,226,0.85)')), color: 0xb08ce2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
    const s = new THREE.Sprite(m);
    s.position.copy(moonPos).setZ(moonPos.z - 0.005);
    group.add(s); rings.push({ s, m });
  }

  // the violet reaching out into the page's air, trees, figures
  const washMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(150,110,210,0.7)')), color: 0x9670d2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const wash = new THREE.Sprite(washMat);
  wash.scale.set(0.4, 0.4, 1); wash.position.copy(moonPos).setZ(0.03);
  group.add(wash);

  const n = q === 'low' ? 18 : 30;
  const moteTex = b.T(radial('rgba(178,140,228,1)'));
  const mpos = new Float32Array(n * 3);
  const mseed: number[] = [];
  const mhome: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * 1.05;
    const y = -HALF_H + Math.random() * PAGE_ASPECT;
    const z = 0.03 + Math.random() * 0.2;
    mpos[i * 3] = x; mpos[i * 3 + 1] = y; mpos[i * 3 + 2] = z;
    mhome.push(x, y, z); mseed.push(Math.random() * 10);
  }
  const mgeo = b.G(new THREE.BufferGeometry());
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mmat = b.M(new THREE.PointsMaterial({ map: moteTex, color: 0xb28ce4, size: 0.028, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(new THREE.Points(mgeo, mmat));

  return {
    group,
    apply(elapsed, _dt, levels, master) {
      const blue = L(levels, 'blueMoon');
      const seep = L(levels, 'violetSeep');
      const prop = L(levels, 'propagate');
      const ringL = L(levels, 'memoryRings');
      const still = L(levels, 'stillness');
      // stillness damps ALL motion — the beat the brief insists on
      const calm = 1 - still * 0.85;

      // hue travels blue → violet as the memory soaks in
      discMat.color.setHSL(0.62 - seep * 0.14, 0.5 + seep * 0.2, 0.86 - seep * 0.05);
      discMat.opacity = master * blue * (0.85 + 0.05 * Math.sin(elapsed * 0.5) * calm);
      haloMat.color.setHSL(0.62 - seep * 0.12, 0.5, 0.8);
      haloMat.opacity = master * blue * (0.12 + 0.05 * Math.sin(elapsed * 0.4) * calm + seep * 0.04);

      rings.forEach((r, i) => {
        const local = clampRing(ringL * 1.4 - i * 0.3);
        const sc = 0.3 + i * 0.16 + local * 0.1 + 0.015 * Math.sin(elapsed * 0.5 + i) * calm;
        r.s.scale.set(sc, sc, 1);
        r.m.opacity = master * local * (0.17 - i * 0.04);
      });

      wash.scale.setScalar(0.36 + prop * 0.55);
      washMat.opacity = master * prop * 0.13;

      const arr = (mgeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        arr[i * 3 + 1] = mhome[i * 3 + 1] + ((elapsed * 0.04 * calm + mseed[i]) % 0.4);
        arr[i * 3] = mhome[i * 3] + Math.sin(elapsed * 0.5 * calm + mseed[i]) * 0.01;
      }
      (mgeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mmat.opacity = master * prop * (0.2 + seep * 0.3);
    },
    dispose() { b.dispose(group); },
  };
}
const clampRing = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ═══════════════════════════════════════════════════════════════
// PAGE 17 — SHE BECAME THE ONE WHO WAS WAITING
// channels: departure · moonReturns · watcherViolet · openingMist · continuation
// ═══════════════════════════════════════════════════════════════
export function createCycleScene(opts: { quality: 'high' | 'low' }): StoryScene {
  const q = opts.quality;
  const group = new THREE.Group();
  const b = new Bag();

  // the girl walking away — a cool aura that recedes
  const girlMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(196,214,246,0.9)')), color: 0xbcd2f2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const girl = new THREE.Sprite(girlMat);
  girl.scale.set(0.16, 0.26, 1); girl.position.set(0.04, -0.05, 0.08);
  group.add(girl);

  // the cover's blue moon, returning
  const moonPos = new THREE.Vector3(0.04, PAGE_ASPECT * 0.28, 0.14);
  const moonMat = b.M(new THREE.SpriteMaterial({ map: b.T(moonFace()), color: 0xbcd2f2, transparent: true, opacity: 0, depthWrite: false })) as THREE.SpriteMaterial;
  const moon = new THREE.Sprite(moonMat);
  moon.scale.set(0.15, 0.15, 1); moon.position.copy(moonPos);
  group.add(moon);

  // the one who stays — violet swelling into recognition
  const watchMat = b.M(new THREE.SpriteMaterial({ map: b.T(radial('rgba(158,124,216,0.9)')), color: 0x9a7cd8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const watcher = new THREE.Sprite(watchMat);
  watcher.scale.set(0.28, 0.48, 1); watcher.position.set(-0.32, -0.02, 0.1);
  group.add(watcher);

  // the opening scene's mist, returning — the loop closing
  const mistTex = b.T(radial('rgba(200,214,240,0.5)'));
  const mist: THREE.Mesh[] = [];
  for (let i = 0; i < (q === 'low' ? 2 : 3); i++) {
    const m = new THREE.Mesh(
      b.G(new THREE.PlaneGeometry(1.1, 0.28)),
      b.M(new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })),
    );
    m.position.set((i - 1) * 0.16, -HALF_H + 0.04 + i * 0.05, 0.02 + i * 0.02);
    group.add(m); mist.push(m);
  }

  // a thread from the watcher toward where the girl went: the wish, passed on
  const threadMat = b.M(new THREE.MeshBasicMaterial({ map: b.T(shaft('rgba(176,140,226,0.7)')), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const thread = new THREE.Mesh(b.G(new THREE.PlaneGeometry(0.34, 0.05)), threadMat);
  thread.position.set(-0.14, -0.04, 0.09);
  group.add(thread);

  return {
    group,
    apply(elapsed, _dt, levels, master) {
      const dep = L(levels, 'departure');
      const mr = L(levels, 'moonReturns');
      const wv = L(levels, 'watcherViolet');
      const om = L(levels, 'openingMist');
      const cont = L(levels, 'continuation');

      // she is here, then a little less here
      girlMat.opacity = master * dep * (0.16 - wv * 0.06 + 0.03 * Math.sin(elapsed * 0.6));
      girl.position.y = -0.05 + dep * 0.012;

      moonMat.opacity = master * mr * (0.45 + 0.06 * Math.sin(elapsed * 0.4));
      moon.scale.setScalar(0.15 + 0.004 * Math.sin(elapsed * 0.5));

      // the reveal: not a flash — a slow understanding
      watchMat.opacity = master * wv * (0.1 + 0.18 * (0.6 + 0.4 * Math.sin(elapsed * 0.5)));
      watcher.scale.set(0.28 + wv * 0.07, 0.48 + wv * 0.1, 1);

      mist.forEach((m, i) => {
        (m.material as THREE.MeshBasicMaterial).opacity = master * om * (0.06 + 0.035 * Math.sin(elapsed * 0.4 + i));
        m.position.x = (i - 1) * 0.16 + Math.sin(elapsed * (0.04 + i * 0.02)) * 0.07 * om;
      });

      // the story does not close — it hands itself to whoever comes next
      threadMat.opacity = master * cont * (0.1 + 0.05 * Math.sin(elapsed * 0.8));
    },
    dispose() { b.dispose(group); },
  };
}
