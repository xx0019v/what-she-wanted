// ────────────────────────────────────────────────────────────────
// Character performance — the girl and the witch as ACTORS, not decoration.
//
// A character is a stack of depth-separated 2.5-D layers (cast shadow, body,
// hair, hem, rim light, breath) built procedurally to match the printed art's
// silhouette. It never replaces the printed figure: it sits just above it and
// gives it weight, breath and intent, so the page's person can *perform*.
//
// Performance channels (0..1), driven by story phases:
//   presence  — how present she is at all
//   breathe   — the small rise and fall of being alive
//   lean      — weight shifting forward: about to take a step
//   sway      — hair and hem moving in the air of the scene
//   reach     — an arm/intent extending toward the other character
//   glow      — her own light (hope, resolve, the light she becomes)
//   drain     — her light leaving her (what the bargain costs)
//
// Every character exposes anchor points so MAGIC can originate at a chest and
// arrive at a hand — the difference between particles and an event.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Bag, L, radialTex, type Layer } from './sceneKit';

export type CharacterKind = 'girl' | 'witch' | 'woman';

export interface CharacterAnchors {
  /** Where memory is taken from / where her light lives. */
  chest: THREE.Vector3;
  /** Where she reaches from; for the witch, where the staff light gathers. */
  hand: THREE.Vector3;
  /** Above the head — for haloes and the moon's attention. */
  head: THREE.Vector3;
  /** At her feet, on the paper. */
  feet: THREE.Vector3;
}

export interface CharacterOptions {
  kind: CharacterKind;
  /** Centre of the figure on the page. */
  x: number;
  /** Baseline (feet) y; defaults to standing on the lower page. */
  yFeet?: number;
  z?: number;
  /** Figure height in anchor units. */
  h?: number;
  /** Which way she faces: +1 looks right, -1 looks left. */
  facing?: 1 | -1;
  /** Channel names. Omit one and that ability is simply not used. */
  presence: string;
  breathe?: string;
  lean?: string;
  sway?: string;
  reach?: string;
  glow?: string;
  drain?: string;
  /** Rim colour — cool for the girl, violet for the witch. */
  rim?: number;
  rimHue?: string;
  /**
   * How visible the drawn silhouette is (0..1). DEFAULT 0 — and that default is
   * deliberate: the printed figure is the star. At 0 we draw no cut-out at all
   * and the performance is carried entirely by rim light, heart light, cast
   * shadow and the moving anchors, so the page's own artwork appears to breathe
   * instead of being covered by a duplicate of itself. Raise it only for a
   * figure the printed page does not already contain.
   */
  silhouette?: number;
}

export interface CharacterHandle extends Layer {
  anchors: CharacterAnchors;
}

// ── silhouette painting ────────────────────────────────────────
type Part = 'body' | 'hair' | 'hem';

function paint(kind: CharacterKind, part: Part): HTMLCanvasElement {
  const W = 160, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const cx = W / 2;
  g.fillStyle = '#000';

  if (kind === 'girl') {
    if (part === 'body') {
      // head, neck, torso, thin legs — a small child seen from behind
      g.beginPath(); g.arc(cx, 62, 26, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - 9, 84, 18, 16);
      g.beginPath();
      g.moveTo(cx - 20, 96); g.lineTo(cx + 20, 96);
      g.lineTo(cx + 23, 186); g.lineTo(cx - 23, 186); g.closePath(); g.fill();
      // arms held close
      g.beginPath(); g.moveTo(cx - 20, 104); g.lineTo(cx - 28, 168); g.lineTo(cx - 20, 170); g.lineTo(cx - 13, 108); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx + 20, 104); g.lineTo(cx + 28, 168); g.lineTo(cx + 20, 170); g.lineTo(cx + 13, 108); g.closePath(); g.fill();
      // legs
      g.fillRect(cx - 13, 246, 10, 52);
      g.fillRect(cx + 3, 246, 10, 52);
    } else if (part === 'hair') {
      // a bob that can swing
      g.beginPath();
      g.moveTo(cx - 29, 56);
      g.quadraticCurveTo(cx - 33, 96, cx - 22, 108);
      g.lineTo(cx + 22, 108);
      g.quadraticCurveTo(cx + 33, 96, cx + 29, 56);
      g.quadraticCurveTo(cx, 26, cx - 29, 56);
      g.fill();
    } else {
      // the dress hem — the part that moves when she moves
      g.beginPath();
      g.moveTo(cx - 23, 176); g.lineTo(cx + 23, 176);
      g.quadraticCurveTo(cx + 38, 226, cx + 33, 254);
      g.quadraticCurveTo(cx, 266, cx - 33, 254);
      g.quadraticCurveTo(cx - 38, 226, cx - 23, 176);
      g.fill();
    }
  } else if (kind === 'witch') {
    if (part === 'body') {
      // pointed hat, head, shoulders, staff arm
      g.beginPath(); g.moveTo(cx + 2, 8); g.lineTo(cx + 34, 74); g.lineTo(cx - 30, 74); g.closePath(); g.fill();
      g.fillRect(cx - 42, 70, 84, 11);
      g.beginPath(); g.arc(cx, 96, 17, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(cx - 22, 110); g.lineTo(cx + 22, 110);
      g.lineTo(cx + 28, 214); g.lineTo(cx - 28, 214); g.closePath(); g.fill();
      // the staff, held out — the instrument of the magic
      g.fillRect(cx + 30, 92, 5, 200);
    } else if (part === 'hair') {
      // long hair falling past the shoulders
      g.beginPath();
      g.moveTo(cx - 20, 88);
      g.quadraticCurveTo(cx - 30, 150, cx - 20, 180);
      g.lineTo(cx + 20, 180);
      g.quadraticCurveTo(cx + 30, 150, cx + 20, 88);
      g.quadraticCurveTo(cx, 74, cx - 20, 88);
      g.fill();
    } else {
      // the robe's long trailing hem
      g.beginPath();
      g.moveTo(cx - 28, 200); g.lineTo(cx + 28, 200);
      g.quadraticCurveTo(cx + 52, 268, cx + 44, 304);
      g.quadraticCurveTo(cx, 316, cx - 44, 304);
      g.quadraticCurveTo(cx - 52, 268, cx - 28, 200);
      g.fill();
    }
  } else {
    // the grown woman: taller, long hair, long dress
    if (part === 'body') {
      g.beginPath(); g.arc(cx, 50, 21, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - 8, 68, 16, 14);
      g.beginPath();
      g.moveTo(cx - 18, 78); g.lineTo(cx + 18, 78);
      g.lineTo(cx + 21, 190); g.lineTo(cx - 21, 190); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx - 18, 86); g.lineTo(cx - 26, 176); g.lineTo(cx - 18, 178); g.lineTo(cx - 11, 90); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx + 18, 86); g.lineTo(cx + 26, 176); g.lineTo(cx + 18, 178); g.lineTo(cx + 11, 90); g.closePath(); g.fill();
    } else if (part === 'hair') {
      g.beginPath();
      g.moveTo(cx - 23, 42);
      g.quadraticCurveTo(cx - 34, 130, cx - 22, 168);
      g.lineTo(cx + 22, 168);
      g.quadraticCurveTo(cx + 34, 130, cx + 23, 42);
      g.quadraticCurveTo(cx, 22, cx - 23, 42);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(cx - 21, 182); g.lineTo(cx + 21, 182);
      g.quadraticCurveTo(cx + 40, 258, cx + 34, 300);
      g.quadraticCurveTo(cx, 312, cx - 34, 300);
      g.quadraticCurveTo(cx - 40, 258, cx - 21, 182);
      g.fill();
    }
  }
  return c;
}

function tex(b: Bag, kind: CharacterKind, part: Part): THREE.Texture {
  const t = new THREE.CanvasTexture(paint(kind, part));
  t.needsUpdate = true;
  return b.T(t);
}

/**
 * Add a performing character. Returns a Layer plus the anchor points magic can
 * attach to, so an effect can start at her chest and end at another's hand.
 */
export function addCharacter(b: Bag, group: THREE.Group, o: CharacterOptions): CharacterHandle {
  const h = o.h ?? 0.26;
  const w = h * 0.5;
  const z = o.z ?? 0.1;
  const face = o.facing ?? 1;
  const yFeet = o.yFeet ?? -0.22;
  const cy = yFeet + h * 0.5;

  const sil = o.silhouette ?? 0;
  type LayerRef = { s: THREE.Sprite; m: THREE.SpriteMaterial; base: number } | null;
  const mk = (part: Part, dz: number, opacity: number, color = 0x0b0f1c): LayerRef => {
    if (sil <= 0) return null; // no cut-out: the printed figure stays the star
    const m = b.M(new THREE.SpriteMaterial({ map: tex(b, o.kind, part), color, transparent: true, opacity: 0, depthWrite: false })) as THREE.SpriteMaterial;
    const s = new THREE.Sprite(m);
    s.scale.set(w * face, h, 1);
    s.position.set(o.x, cy, z + dz);
    group.add(s);
    return { s, m, base: opacity * sil };
  };

  // depth-separated layers: hem sits behind, body in the middle, hair in front
  const hem = mk('hem', -0.004, 0.8);
  const body = mk('body', 0, 0.88);
  const hair = mk('hair', 0.004, 0.9);

  // a cast shadow that reaches FORWARD off the page onto the table
  const shadowMat = b.M(new THREE.MeshBasicMaterial({ map: radialTex(b, 'rgba(0,0,0,0.85)'), transparent: true, opacity: 0, depthWrite: false }));
  const shadow = new THREE.Mesh(b.G(new THREE.PlaneGeometry(w * 1.3, h * 1.1)), shadowMat);
  shadow.position.set(o.x, yFeet - h * 0.42, 0.002);
  group.add(shadow);

  // rim light along her lit edge — this is what makes a cut-out read as a body
  const rimMat = b.M(new THREE.SpriteMaterial({
    map: radialTex(b, o.rimHue ?? 'rgba(206,224,250,0.9)'),
    color: o.rim ?? 0xcee0fa, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  })) as THREE.SpriteMaterial;
  const rim = new THREE.Sprite(rimMat);
  rim.scale.set(w * 1.5, h * 1.2, 1);
  rim.position.set(o.x + face * w * 0.16, cy, z - 0.008);
  group.add(rim);

  // her own light, at the chest — this is what magic takes, or what she becomes
  const heartMat = b.M(new THREE.SpriteMaterial({
    map: radialTex(b, o.rimHue ?? 'rgba(206,224,250,0.9)'),
    color: o.rim ?? 0xcee0fa, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  })) as THREE.SpriteMaterial;
  const heart = new THREE.Sprite(heartMat);
  const chestY = cy + h * 0.12;
  heart.scale.set(w * 0.5, w * 0.5, 1);
  heart.position.set(o.x, chestY, z + 0.01);
  group.add(heart);

  const anchors: CharacterAnchors = {
    chest: new THREE.Vector3(o.x, chestY, z + 0.01),
    hand: new THREE.Vector3(o.x + face * w * 0.55, cy + h * 0.06, z + 0.02),
    head: new THREE.Vector3(o.x, cy + h * 0.55, z),
    feet: new THREE.Vector3(o.x, yFeet, z),
  };

  return {
    anchors,
    update(elapsed, levels, master) {
      const on = L(levels, o.presence);
      const br = L(levels, o.breathe);
      const ln = L(levels, o.lean);
      const sw = L(levels, o.sway);
      const rc = L(levels, o.reach);
      const gl = L(levels, o.glow);
      const dr = L(levels, o.drain);

      // breath: a tiny vertical rise and fall through the whole figure
      const breath = Math.sin(elapsed * 0.9) * 0.0035 * (0.4 + br);
      // the weight shift that reads as "about to step"
      const forward = ln * 0.02 * face;
      const tilt = ln * 0.045 * face;

      if (body) {
        body.m.opacity = master * on * body.base;
        body.s.position.set(o.x + forward, cy + breath, z);
        body.s.material.rotation = tilt;
      }
      if (hair) {
        // hair lags behind the body and swings in the scene's air
        const swing = Math.sin(elapsed * 0.7) * 0.05 * (0.25 + sw) + rc * 0.06 * face;
        hair.m.opacity = master * on * hair.base;
        hair.s.position.set(o.x + forward * 1.25, cy + breath * 1.2, z + 0.004);
        hair.s.material.rotation = tilt + swing * 0.5;
        hair.s.scale.set(w * face * (1 + sw * 0.03), h * (1 + Math.sin(elapsed * 0.7) * 0.006 * sw), 1);
      }
      if (hem) {
        // the hem trails the step and the wind
        const hemSwing = Math.sin(elapsed * 0.55 + 0.8) * 0.07 * (0.25 + sw);
        hem.m.opacity = master * on * hem.base;
        hem.s.position.set(o.x + forward * 0.7, cy + breath * 0.6, z - 0.004);
        hem.s.material.rotation = tilt * 0.6 + hemSwing * 0.4;
        hem.s.scale.set(w * face * (1 + sw * 0.06 + ln * 0.03), h * (1 + sw * 0.02), 1);
      }

      // the shadow lengthens forward as she leans — presence in the room
      shadowMat.opacity = master * on * (0.18 + ln * 0.12);
      shadow.scale.set(w * 1.3 * (1 + ln * 0.1), h * 1.1 * (1 + ln * 0.35), 1);
      shadow.position.y = yFeet - h * (0.42 + ln * 0.16);

      // rim light follows the lean; brightens with her own light
      rimMat.opacity = master * on * (0.1 + gl * 0.22) * (0.7 + 0.3 * Math.sin(elapsed * 0.6));
      rim.position.set(o.x + face * w * 0.16 + forward, cy + breath, z - 0.008);

      // her heart-light: rises with `glow`, and is emptied by `drain`
      const heartLevel = Math.max(0, (0.16 + gl * 0.5) * (1 - dr));
      heartMat.opacity = master * on * heartLevel * (0.6 + 0.4 * Math.sin(elapsed * 1.1));
      heart.scale.setScalar(w * (0.42 + gl * 0.3) * (1 - dr * 0.4));
      heart.position.set(o.x + forward, chestY + breath, z + 0.01);

      // keep the anchors live so magic tracks the performance
      anchors.chest.set(o.x + forward, chestY + breath, z + 0.01);
      anchors.hand.set(o.x + face * w * (0.55 + rc * 0.25) + forward, cy + h * 0.06 + breath, z + 0.02);
      anchors.head.set(o.x + forward, cy + h * 0.55 + breath, z);
    },
  };
}
