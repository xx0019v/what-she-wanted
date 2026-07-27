// ────────────────────────────────────────────────────────────────
// Anchor FX — the forest that rises OFF page 04 into real space.
// Attached to a tracked group (MindAR anchor in AR, or a plain group in the
// browser preview). Everything is procedural; nothing opaque covers the
// printed text. The point of this module is DEPTH: layers live at clearly
// different z, so tilting the phone yields real parallax and the world spills
// past the paper's edges into the space around it.
//
// Anchor space: page width = 1 (x ∈ [-0.5, 0.5]); page height = 0.5625
// (y ∈ [-0.281, 0.281]); +z toward the viewer. Small positive z floats above
// paper; large positive z is "in front, in the room". Fog/fireflies/branches
// deliberately exceed the page rectangle so the forest crosses the edge.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const PAGE_ASPECT = 1080 / 1920; // 0.5625
const HALF_H = PAGE_ASPECT * 0.5;

export interface AnchorFX {
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

export interface AnchorFXOptions {
  quality: 'high' | 'low';
}

export function buildAnchorFX(group: THREE.Group, opts: AnchorFXOptions): AnchorFX {
  const q = opts.quality;
  const textures: THREE.Texture[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const effects: Array<(t: number, dt: number) => void> = [];

  const trackTex = (t: THREE.Texture) => { textures.push(t); return t; };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T) => { geoms.push(g); return g; };
  const trackMat = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  const radial = (color: string, mid = '1'): THREE.Texture => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, color);
    if (mid !== '1') grd.addColorStop(parseFloat(mid), color.replace(/[\d.]+\)$/, '0.3)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return trackTex(t);
  };

  // A shaded moon disc — light falls from upper-left so, floating above the
  // page, it reads as a small dimensional body rather than a flat sticker.
  const moonDiscTex = (): THREE.Texture => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(S * 0.4, S * 0.38, S * 0.04, S * 0.5, S * 0.5, S * 0.5);
    grd.addColorStop(0, 'rgba(244,248,255,1)');
    grd.addColorStop(0.55, 'rgba(214,228,248,0.98)');
    grd.addColorStop(0.85, 'rgba(150,172,210,0.85)');
    grd.addColorStop(1, 'rgba(150,172,210,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
    // faint maria for character
    g.globalCompositeOperation = 'source-atop';
    for (const [x, y, r] of [[0.44, 0.46, 0.18], [0.6, 0.56, 0.13], [0.52, 0.36, 0.1]] as const) {
      const mg = g.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S);
      mg.addColorStop(0, 'rgba(150,168,204,0.16)');
      mg.addColorStop(1, 'rgba(150,168,204,0)');
      g.fillStyle = mg; g.beginPath(); g.arc(x * S, y * S, r * S, 0, Math.PI * 2); g.fill();
    }
    // limb shadow lower-right
    const limb = g.createRadialGradient(S * 0.4, S * 0.38, S * 0.26, S * 0.5, S * 0.5, S * 0.5);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(24,32,54,0.4)');
    g.fillStyle = limb; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return trackTex(t);
  };

  const beamTex = (color: string): THREE.Texture => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d')!;
    const hx = g.createLinearGradient(0, 0, 64, 0);
    hx.addColorStop(0, 'rgba(0,0,0,0)'); hx.addColorStop(0.5, color); hx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hx; g.fillRect(0, 0, 64, 256);
    const vy = g.createLinearGradient(0, 0, 0, 256);
    vy.addColorStop(0, 'rgba(0,0,0,1)'); vy.addColorStop(0.15, 'rgba(0,0,0,0)');
    vy.addColorStop(0.82, 'rgba(0,0,0,0)'); vy.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = vy; g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return trackTex(t);
  };

  const branchTex = (): THREE.Texture => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineCap = 'round';
    const branch = (x0: number, y0: number, x1: number, y1: number, w: number, d: number) => {
      g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0);
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 26;
      const my = (y0 + y1) / 2 - Math.random() * 16;
      g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
      if (d > 0 && w > 1.4) {
        const n = 2 + ((Math.random() * 2) | 0);
        for (let i = 0; i < n; i++) {
          const t = 0.4 + Math.random() * 0.5;
          const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
          branch(bx, by, bx + (Math.random() - 0.5) * 80, by - 16 - Math.random() * 44, w * 0.55, d - 1);
        }
      }
    };
    branch(10, 30, 250, 70, 8, 3);
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * 256, y = 20 + Math.random() * 90;
      const rx = 3 + Math.random() * 7, ry = rx * (0.4 + Math.random() * 0.3);
      g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return trackTex(t);
  };

  // ── 1. Ground fog — spills PAST the page's side & bottom edges ──────────
  const fogTex = radial('rgba(200,214,240,0.5)');
  const fogLayers = q === 'low' ? 2 : 4;
  for (let i = 0; i < fogLayers; i++) {
    const geo = trackGeo(new THREE.PlaneGeometry(1.5, 0.28)); // 1.5 > page width → overflows sides
    const mat = trackMat(new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
    const m = new THREE.Mesh(geo, mat);
    const baseY = -HALF_H + 0.02 + i * 0.03;
    m.position.set((i - 1.5) * 0.16, baseY, 0.01 + i * 0.02);
    group.add(m);
    const baseX = m.position.x;
    const sp = 0.05 + i * 0.02;
    effects.push((t) => {
      m.position.x = baseX + Math.sin(t * sp) * 0.06;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.09 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.4 + i));
    });
  }

  // ── 2. Fireflies — varied depth, some fly OFF the page into the room ────
  const flyN = q === 'low' ? 12 : 22;
  const flyTex = radial('rgba(255,236,180,1)');
  const flyPos = new Float32Array(flyN * 3);
  const flyBase: number[] = [];
  for (let i = 0; i < flyN; i++) {
    const x = (Math.random() - 0.5) * 1.3;             // beyond ±0.5 → off-page
    const y = -HALF_H + Math.random() * (PAGE_ASPECT * 1.15);
    const z = 0.02 + Math.random() * 0.3;              // deep parallax range
    flyPos[i * 3] = x; flyPos[i * 3 + 1] = y; flyPos[i * 3 + 2] = z;
    flyBase.push(x, y, z);
  }
  const flyGeo = trackGeo(new THREE.BufferGeometry());
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = trackMat(new THREE.PointsMaterial({ map: flyTex, color: 0xffe6a6, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const flies = new THREE.Points(flyGeo, flyMat);
  group.add(flies);
  effects.push((t) => {
    const arr = (flyGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < flyN; i++) {
      arr[i * 3] = flyBase[i * 3] + Math.sin(t * 0.5 + i) * 0.03;
      arr[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(t * 0.7 + i * 1.3) * 0.02;
    }
    (flyGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    flyMat.opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 1.4));
  });

  // ── 3. TRUE-depth moon — floats well in front of the printed moon ──────
  // A shaded disc high in +z: tilt the phone and it visibly parallaxes away
  // from the moon printed on the page. Halo + slow breath.
  const moonZ = 0.16;
  const moonPos = new THREE.Vector3(0.0, PAGE_ASPECT * 0.36, moonZ);
  const haloMat = trackMat(new THREE.SpriteMaterial({ map: radial('rgba(200,220,250,0.9)'), color: 0xcfe0f6, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(0.4, 0.4, 1); halo.position.copy(moonPos).setZ(moonZ - 0.01);
  group.add(halo);
  // sized to sit over the printed moon so, head-on, they read as one body that
  // has lifted off the paper; off-axis, the z-gap parallaxes them apart.
  const discMat = trackMat(new THREE.SpriteMaterial({ map: moonDiscTex(), transparent: true, opacity: 0.92, depthWrite: false })) as THREE.SpriteMaterial;
  const disc = new THREE.Sprite(discMat);
  disc.scale.set(0.16, 0.16, 1); disc.position.copy(moonPos);
  group.add(disc);
  effects.push((t) => {
    const b = 0.5 + 0.5 * Math.sin(t * 0.5);
    haloMat.opacity = 0.12 + 0.06 * b;
    disc.scale.setScalar(0.16 + 0.005 * Math.sin(t * 0.6));
    disc.position.y = moonPos.y + 0.004 * Math.sin(t * 0.4);
  });

  // ── 3b. Moonbeam — a soft shaft from the floating moon to the page ─────
  const beamMat = trackMat(new THREE.MeshBasicMaterial({ map: beamTex('rgba(206,222,246,0.6)'), transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }));
  const beam = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.3, PAGE_ASPECT * 0.95)), beamMat);
  beam.position.set(0.0, PAGE_ASPECT * 0.03, 0.06);
  group.add(beam);
  effects.push((t) => { beamMat.opacity = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.32)); beam.scale.x = 1 + 0.06 * Math.sin(t * 0.4); });

  // ── 4. Foreground branches — overhang the TOP edge, far in front ───────
  // They sit above the page (y > +halfH) and forward (z large), so they crop
  // into real space and parallax strongly over the paper.
  const branchTexture = branchTex();
  const branchSpecs = [
    { x: -0.42, y: HALF_H + 0.12, z: 0.24, rot: -0.5, w: 0.9, h: 0.6, flip: 1 },
    { x: 0.46, y: HALF_H + 0.16, z: 0.28, rot: 0.5, w: 1.0, h: 0.62, flip: -1 },
  ];
  for (const b of branchSpecs) {
    const geo = trackGeo(new THREE.PlaneGeometry(b.w * b.flip, b.h));
    const mat = trackMat(new THREE.MeshBasicMaterial({ map: branchTexture, transparent: true, opacity: 0.9, depthWrite: false, color: 0x05070e }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x, b.y, b.z);
    mesh.rotation.z = b.rot;
    group.add(mesh);
    const baseRot = b.rot;
    effects.push((t) => { mesh.rotation.z = baseRot + Math.sin(t * 0.25) * 0.02; });
  }

  // ── 5. The girl's presence — a cool aura at her feet + a shadow that
  //     reaches FORWARD off the page onto the table (her presence in the room).
  const girlX = -0.02, girlY = -HALF_H + 0.12;
  const auraMat = trackMat(new THREE.SpriteMaterial({ map: radial('rgba(190,208,242,0.8)'), color: 0xbcd0f0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(0.34, 0.34, 1); aura.position.set(girlX, girlY + 0.06, 0.03);
  group.add(aura);
  // forward-cast shadow: a soft dark ellipse below the page bottom edge, at
  // near-zero z (on the "table"), stretching into real space.
  const shadowMat = trackMat(new THREE.MeshBasicMaterial({ map: radial('rgba(0,0,0,0.8)'), transparent: true, opacity: 0.28, depthWrite: false }));
  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.34, 0.5)), shadowMat);
  shadow.position.set(girlX, -HALF_H - 0.16, 0.002);
  shadow.rotation.z = 0;
  group.add(shadow);
  // rising air around her
  const airN = q === 'low' ? 5 : 9;
  const airTex = radial('rgba(190,205,240,1)');
  const airPos = new Float32Array(airN * 3);
  const airSeed: number[] = [];
  for (let i = 0; i < airN; i++) {
    airPos[i * 3] = girlX + (Math.random() - 0.5) * 0.14;
    airPos[i * 3 + 1] = girlY - 0.02 + Math.random() * 0.1;
    airPos[i * 3 + 2] = 0.03 + Math.random() * 0.1;
    airSeed.push(Math.random() * 10);
  }
  const airGeo = trackGeo(new THREE.BufferGeometry());
  airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3));
  const airMat = trackMat(new THREE.PointsMaterial({ map: airTex, color: 0xbcd0f0, size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  const air = new THREE.Points(airGeo, airMat);
  group.add(air);
  const airBaseY = airPos.slice();
  effects.push((t) => {
    auraMat.opacity = 0.12 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.7));
    shadowMat.opacity = 0.22 + 0.05 * Math.sin(t * 0.5);
    const arr = (airGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < airN; i++) {
      const rise = ((t * 0.03 + airSeed[i]) % 0.2);
      arr[i * 3 + 1] = airBaseY[i * 3 + 1] + rise;
      arr[i * 3] = airBaseY[i * 3] + Math.sin(t * 0.6 + airSeed[i]) * 0.012;
    }
    (airGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    airMat.opacity = 0.28 + 0.2 * Math.sin(t * 0.8);
  });

  // ── 6. Hidden witch — only a presence: a faint violet glow among the
  //     trees to one side, mid-depth, that breathes and drifts. Never shown.
  const witchGlowMat = trackMat(new THREE.SpriteMaterial({ map: radial('rgba(158,124,216,0.9)'), color: 0x9a7cd8, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending })) as THREE.SpriteMaterial;
  const witchGlow = new THREE.Sprite(witchGlowMat);
  witchGlow.scale.set(0.26, 0.4, 1);
  witchGlow.position.set(0.34, -0.02, 0.12);
  group.add(witchGlow);
  effects.push((t) => {
    // slow tide in and out — a presence that comes and goes
    const tide = Math.max(0, Math.sin(t * 0.12 - 1.0));
    witchGlowMat.opacity = tide * 0.22;
    witchGlow.position.x = 0.34 + Math.sin(t * 0.2) * 0.02;
  });

  return {
    update: (t: number, dt: number) => { for (const e of effects) e(t, dt); },
    dispose: () => {
      textures.forEach((t) => t.dispose());
      geoms.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      group.clear();
    },
  };
}
