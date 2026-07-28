// ────────────────────────────────────────────────────────────────
// Magic that ACTS.
//
// The difference between an effect and an event is that an event has a source,
// a path, and a target — and the target visibly changes. Drifting particles are
// atmosphere. Memory being pulled out of a child's chest, travelling along an
// arc, and arriving in a witch's hand while the child's own light goes out —
// that is the bargain, made visible.
//
// Everything here reads LIVE anchor points, so the magic tracks the characters'
// performance instead of firing at fixed coordinates.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Bag, L, radialTex, ringTex, type Layer, type Quality } from './sceneKit';

type Anchor = () => THREE.Vector3;

/**
 * A transfer: something is taken from one place and delivered to another.
 * Particles are born at `from`, arc along a curve, and arrive at `to`. The arc
 * keeps it from reading as a straight laser; the arrival is what sells it.
 */
export function addTransfer(
  b: Bag, group: THREE.Group,
  o: {
    channel: string; quality: Quality;
    from: Anchor; to: Anchor;
    hue: string; color: number;
    n?: number; size?: number;
    /** How far the arc bows away from the straight line. */
    bow?: number;
    /** Speed of travel along the path. */
    speed?: number;
  },
): Layer {
  const n = o.n ?? (o.quality === 'low' ? 18 : 34);
  const pos = new Float32Array(n * 3);
  const seed: number[] = [];
  const jitter: number[] = [];
  for (let i = 0; i < n; i++) {
    seed.push(Math.random());
    jitter.push((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.04);
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({
    map: radialTex(b, o.hue), color: o.color, size: o.size ?? 0.03,
    sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  group.add(new THREE.Points(geo, mat));
  const bow = o.bow ?? 0.12;
  const speed = o.speed ?? 0.28;

  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      if (on <= 0.001) { mat.opacity = 0; return; }
      const a = o.from();
      const c = o.to();
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        // each particle runs its own lap along the path
        const t = (elapsed * speed + seed[i]) % 1;
        // quadratic arc: the control point bows perpendicular to the line
        const mx = (a.x + c.x) / 2 + (c.y - a.y) * bow;
        const my = (a.y + c.y) / 2 - (c.x - a.x) * bow + bow * 0.5;
        const mz = (a.z + c.z) / 2 + bow * 0.4;
        const u = 1 - t;
        const x = u * u * a.x + 2 * u * t * mx + t * t * c.x;
        const y = u * u * a.y + 2 * u * t * my + t * t * c.y;
        const z = u * u * a.z + 2 * u * t * mz + t * t * c.z;
        // spread at the source, converge at the target: it is being *received*
        const gather = 1 - t;
        arr[i * 3] = x + jitter[i * 3] * gather;
        arr[i * 3 + 1] = y + jitter[i * 3 + 1] * gather;
        arr[i * 3 + 2] = z + jitter[i * 3 + 2] * gather;
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = master * on * (0.72 + 0.24 * Math.sin(elapsed * 1.2));
    },
  };
}

/**
 * A wavefront: a change that travels. Used when the colour of the world is
 * altered by an event rather than simply fading in — the violet leaving the
 * moon and reaching the forest is a thing that happens, in a direction.
 */
export function addWavefront(
  b: Bag, group: THREE.Group,
  o: {
    channel: string;
    from: THREE.Vector3; to: THREE.Vector3;
    hue: string; color: number;
    width?: number; strength?: number;
  },
): Layer {
  const mat = b.M(new THREE.SpriteMaterial({
    map: radialTex(b, o.hue), color: o.color, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })) as THREE.SpriteMaterial;
  const s = new THREE.Sprite(mat);
  s.position.copy(o.from);
  group.add(s);
  const width = o.width ?? 0.5;

  return {
    update(_e, levels, master) {
      const on = L(levels, o.channel);
      if (on <= 0.001) { mat.opacity = 0; return; }
      // the front travels from → to across the phase, widening as it goes
      s.position.lerpVectors(o.from, o.to, on);
      const sc = width * (0.5 + on * 1.1);
      s.scale.set(sc, sc * 0.7, 1);
      // brightest mid-travel: it is a passing change, not a light left on
      const bell = Math.sin(Math.min(1, on) * Math.PI);
      mat.opacity = master * bell * (o.strength ?? 0.18);
    },
  };
}

/**
 * A gathering: something forms at a point because two forces are meeting there.
 * Rings tighten inward as the level rises — the promise being struck.
 */
export function addGathering(
  b: Bag, group: THREE.Group,
  o: { channel: string; at: Anchor; hue: string; color: number; n?: number; base?: number; strength?: number },
): Layer {
  const n = o.n ?? 3;
  const items: Array<{ s: THREE.Sprite; m: THREE.SpriteMaterial }> = [];
  for (let i = 0; i < n; i++) {
    const m = b.M(new THREE.SpriteMaterial({
      map: ringTex(b, o.hue), color: o.color, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })) as THREE.SpriteMaterial;
    const s = new THREE.Sprite(m);
    group.add(s);
    items.push({ s, m });
  }
  const base = o.base ?? 0.3;
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const p = o.at();
      items.forEach((r, i) => {
        r.s.position.copy(p);
        const local = Math.max(0, Math.min(1, on * 1.5 - i * 0.25));
        // rings CONTRACT as the bargain closes
        const sc = base * (1.5 - local * 0.5) + i * 0.08 + 0.012 * Math.sin(elapsed * 0.6 + i);
        r.s.scale.set(sc, sc, 1);
        r.m.opacity = master * local * ((o.strength ?? 0.16) - i * 0.03);
      });
    },
  };
}

/**
 * A beam held between two live points — the staff's light reaching the space
 * between them. Stretches and aims itself as the characters move.
 */
export function addLink(
  b: Bag, group: THREE.Group,
  o: { channel: string; from: Anchor; to: Anchor; hue: string; color: number; thickness?: number; strength?: number },
): Layer {
  const mat = b.M(new THREE.MeshBasicMaterial({
    map: radialTex(b, o.hue), color: o.color, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const mesh = new THREE.Mesh(b.G(new THREE.PlaneGeometry(1, o.thickness ?? 0.045)), mat);
  group.add(mesh);
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      if (on <= 0.001) { mat.opacity = 0; return; }
      const a = o.from(), c = o.to();
      const dx = c.x - a.x, dy = c.y - a.y;
      const len = Math.hypot(dx, dy);
      mesh.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, Math.max(a.z, c.z) + 0.005);
      mesh.rotation.z = Math.atan2(dy, dx);
      mesh.scale.set(len * on, 1, 1);
      mat.opacity = master * on * (o.strength ?? 0.2) * (0.65 + 0.35 * Math.sin(elapsed * 1.4));
    },
  };
}

/**
 * Attention: the world turning toward someone. Trees lean, lights orient — the
 * forest noticing her is an event, not weather.
 */
export function addAttention(
  b: Bag, group: THREE.Group,
  o: { channel: string; at: Anchor; quality: Quality; n?: number; hue?: string; color?: number },
): Layer {
  const n = o.n ?? (o.quality === 'low' ? 10 : 18);
  const tex = radialTex(b, o.hue ?? 'rgba(255,236,180,1)');
  const pos = new Float32Array(n * 3);
  const home: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.24 + Math.random() * 0.3;
    const x = Math.cos(a) * r;
    const y = -0.1 + Math.sin(a) * r * 0.5;
    const z = 0.03 + Math.random() * 0.16;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    home.push(x, y, z); seed.push(Math.random() * 6.28);
  }
  const geo = b.G(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = b.M(new THREE.PointsMaterial({
    map: tex, color: o.color ?? 0xffe6a6, size: 0.036, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(new THREE.Points(geo, mat));
  return {
    update(elapsed, levels, master) {
      const on = L(levels, o.channel);
      const p = o.at();
      const arr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < n; i++) {
        // they drift from their own places TOWARD her as attention rises
        const pull = on * 0.55;
        arr[i * 3] = home[i * 3] + (p.x - home[i * 3]) * pull + Math.sin(elapsed * 0.6 + seed[i]) * 0.02;
        arr[i * 3 + 1] = home[i * 3 + 1] + (p.y - home[i * 3 + 1]) * pull + Math.sin(elapsed * 0.8 + seed[i]) * 0.016;
        arr[i * 3 + 2] = home[i * 3 + 2];
      }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = master * on * (0.45 + 0.4 * Math.abs(Math.sin(elapsed * 1.3)));
    },
  };
}
