// ────────────────────────────────────────────────────────────────
// The 17 page stages, each composed from the scene kit.
//
// Every object is phase-driven: a channel at 0 means that beat has not happened
// and the object is genuinely absent. Each page assembles a different set of
// objects, so no two pages share a look — and each one is dense enough to feel
// like a world, not an effect.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { StoryScene } from './storyTypes';
import {
  Bag, HALF_H, PAGE_ASPECT, composeScene,
  addMoon, addShaft, addTreeField, addCanopy, addMist, addFireflies, addMotes,
  addSparkStream, addRibbons, addAura, addCrowd, addLightThreads,
  addRings, addWash, addForwardShadow, addStars, addTendrils, addGround,
  type Layer, type Quality,
} from './sceneKit';
import { addRig } from './rig';
import { addTransfer, addWavefront, addGathering, addLink, addAttention } from './magic';

export { PAGE_ASPECT } from './sceneKit';

type Opts = { quality: Quality };
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ═══ p1 COVER — the two of them under the moon, before anything ═══
export function createCoverScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addStars(b, g, { channel: 'nightSky', quality, n: 70 }),
    addMoon(b, g, { pos: V3(-0.03, PAGE_ASPECT * 0.4, 0.15), size: 0.2, channel: 'moon' }),
    addShaft(b, g, { x: -0.03, y: 0.02, channel: 'moon', w: 0.34 }),
    addMist(b, g, { channel: 'hillMist', quality, y: -HALF_H - 0.02, layers: 3, width: 1.2 }),
    addAura(b, g, { channel: 'twoOfThem', x: -0.04, y: -0.06, hue: 'rgba(196,214,246,0.9)', color: 0xbcd2f2, w: 0.16, h: 0.26, strength: 0.16 }),
    addAura(b, g, { channel: 'twoOfThem', x: 0.14, y: -0.02, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.2, h: 0.34, strength: 0.18 }),
    addSparkStream(b, g, { channel: 'sparks', quality, from: V3(0.1, -0.1, 0.06), to: V3(0.42, 0.08, 0.14), hue: 'rgba(214,196,252,1)', color: 0xd6c4fc, n: 30 }),
    addMotes(b, g, { channel: 'sparks', quality, n: 26, hue: 'rgba(226,236,255,1)', color: 0xe2ecff, size: 0.02, rise: 0.3 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p2 NIGHTMARE — the room will not let her sleep ═══
export function createNightmareScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(-0.34, PAGE_ASPECT * 0.34, 0.13), size: 0.12, channel: 'windowMoon' }),
    addShaft(b, g, { x: -0.3, y: -0.02, channel: 'windowMoon', w: 0.22, rot: 0.12 }),
    addTendrils(b, g, { channel: 'tendrils', quality, n: 6 }),
    addRibbons(b, g, { channel: 'tendrils', quality, n: 3, color: 0x1a1430, hue: 'rgba(26,20,48,0.8)', y: 0.12, amp: 0.09, dark: true }),
    addMotes(b, g, { channel: 'unrest', quality, n: 30, hue: 'rgba(150,160,200,1)', color: 0x96a0c8, size: 0.02, rise: 0.5 }),
    addAura(b, g, { channel: 'sheWakes', x: -0.06, y: -0.12, hue: 'rgba(196,214,246,0.9)', color: 0xbcd2f2, w: 0.26, h: 0.18, strength: 0.14 }),
    addWash(b, g, { channel: 'dread', hue: 'rgba(40,32,70,0.8)', color: 0x282046, max: 0.5, strength: 0.16 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p3 THE DOOR — the forest is already breathing through it ═══
export function createThresholdScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.05, PAGE_ASPECT * 0.3, 0.14), size: 0.11, channel: 'moonBeyond' }),
    addShaft(b, g, { x: 0.0, y: -0.04, channel: 'moonBeyond', w: 0.3, h: PAGE_ASPECT * 1.05 }),
    addTreeField(b, g, { channel: 'forestBeyond', quality, bands: 2, color: 0x18283c, yBase: -0.04, spread: 0.6 }),
    addMist(b, g, { channel: 'mistEnters', overflowChannel: 'spillsIn', quality, y: -HALF_H + 0.02, layers: 4, width: 0.9 }),
    addFireflies(b, g, { channel: 'invitation', gatherChannel: 'spillsIn', quality, n: 16, spread: 0.5 }),
    addAura(b, g, { channel: 'resolve', x: -0.02, y: -0.06, hue: 'rgba(206,224,250,0.9)', color: 0xcee0fa, w: 0.16, h: 0.3, strength: 0.15 }),
    addForwardShadow(b, g, { channel: 'spillsIn', x: -0.02, w: 0.26, h: 0.4 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p4 INTO THE FOREST — the forest notices her, and she goes anyway ═══
// The event: a child decides. The forest turns toward her; she shifts her weight
// forward; something violet watches from the trees and withdraws.
export function createForestScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();

  // She is the subject of this page, so she is built first and everything else
  // is staged around her.
  // The printed girl herself, cut into parts and hung on pivots: when she leans
  // and steps, it is HER painted pixels that move.
  const girl = addRig(b, g, {
    page: 4, character: 'girl', facing: 1,
    perf: {
      presence: 'sheIsHere', breathe: 'sheIsHere', lean: 'sheSteps',
      sway: 'forestBreathes', step: 'sheSteps', look: 'watched', glow: 'herResolve',
    },
  });

  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.02, PAGE_ASPECT * 0.36, 0.16), size: 0.16, channel: 'moonBreath' }),
    addShaft(b, g, { x: 0.02, y: PAGE_ASPECT * 0.03, channel: 'moonBreath', w: 0.3 }),
    addMist(b, g, { channel: 'forestBreathes', overflowChannel: 'overflow', quality, layers: 5, width: 1.0 }),
    // the ground is a surface she walks on, not a backdrop: it stands up off the
    // paper and parts around her feet as she steps
    addGround(b, g, {
      channel: 'forestBreathes', quality,
      partAround: () => girl.anchors.feet, partChannel: 'sheSteps',
    }),
    addTreeField(b, g, { channel: 'depth', quality, bands: 4, spread: 1.6 }),
    addCanopy(b, g, { channel: 'branches', count: 3 }),
    // the forest's lights leave their places and come to her: it noticed her
    addFireflies(b, g, { channel: 'forestBreathes', gatherChannel: 'overflow', quality, n: 24, spread: 0.9 }),
    addAttention(b, g, { channel: 'forestNotices', at: () => girl.anchors.chest, quality, n: 18 }),
    girl,
    // the witch is watching from the trees — she swells, then withdraws
    addAura(b, g, { channel: 'watched', x: 0.36, y: -0.01, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.22, h: 0.38, strength: 0.24 }),
    addTransfer(b, g, {
      channel: 'watched', quality, from: () => V3(0.36, -0.01, 0.1), to: () => girl.anchors.head,
      hue: 'rgba(178,140,228,1)', color: 0xb28ce4, n: 14, size: 0.022, bow: 0.18, speed: 0.16,
    }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p5 FIRST MEETING — the bargain, made visible ═══
// The event: she asks to have her memories taken, and they are taken. Strands
// leave HER CHEST, cross the gap, and arrive in the WITCH'S HAND — while her own
// light goes out by exactly as much as the witch receives.
export function createContractScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();

  // Both printed figures, rigged: she looks up and leans in to ask; the witch
  // lifts her staff and reaches; her light drains as the memory is taken.
  const girl = addRig(b, g, {
    page: 5, character: 'girl', facing: 1,
    perf: {
      presence: 'sheStandsThere', breathe: 'sheStandsThere', lean: 'sheAsks',
      sway: 'theAir', look: 'sheStandsThere', glow: 'herWish', drain: 'itIsTaken',
    },
  });
  const witch = addRig(b, g, {
    page: 5, character: 'witch', facing: -1,
    perf: {
      presence: 'sheIsListening', breathe: 'sheIsListening', sway: 'theAir',
      reach: 'sheAccepts', glow: 'sheAccepts',
    },
    rimColor: 0xb084e0, rimHue: 'rgba(176,132,224,0.9)',
  });
  const midpoint = () => new THREE.Vector3(
    (girl.anchors.chest.x + witch.anchors.hand.x) / 2,
    (girl.anchors.chest.y + witch.anchors.hand.y) / 2 + 0.03,
    0.1,
  );

  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.02, PAGE_ASPECT * 0.34, 0.15), size: 0.12, channel: 'theHush' }),
    addTreeField(b, g, { channel: 'theHush', quality, bands: 2, color: 0x101c2c, spread: 1.4 }),
    addMist(b, g, { channel: 'theAir', quality, layers: 4, width: 1.0 }),
    addGround(b, g, {
      channel: 'theAir', quality,
      partAround: () => girl.anchors.feet, partChannel: 'sheAsks',
      tintChannel: 'itIsTaken',
    }),
    girl,
    witch,
    // the staff answers before she does
    addShaft(b, g, { x: 0.31, y: 0.03, channel: 'sheAccepts', w: 0.07, h: PAGE_ASPECT * 0.8, color: 'rgba(190,160,236,0.85)' }),
    // THE EVENT: memory leaves the child and is received by the witch
    addTransfer(b, g, {
      channel: 'itIsTaken', quality,
      from: () => girl.anchors.chest, to: () => witch.anchors.hand,
      hue: 'rgba(170,205,250,1)', color: 0xaacdfa, n: 46, size: 0.038, bow: 0.16, speed: 0.3,
    }),
    // the witch's own power answers back along the same gap — they meet, they
    // do not merge: a contract, not a union
    addTransfer(b, g, {
      channel: 'sheAccepts', quality,
      from: () => witch.anchors.hand, to: () => midpoint(),
      hue: 'rgba(190,148,238,1)', color: 0xbe94ee, n: 32, size: 0.034, bow: -0.14, speed: 0.24,
    }),
    addLink(b, g, {
      channel: 'itIsTaken', from: () => girl.anchors.chest, to: () => witch.anchors.hand,
      hue: 'rgba(206,214,250,0.85)', color: 0xced6fa, thickness: 0.03, strength: 0.16,
    }),
    // the promise closing: rings that contract on the space between them
    addGathering(b, g, {
      channel: 'itIsSealed', at: midpoint, hue: 'rgba(176,140,226,0.9)', color: 0xb08ce2, n: 3, base: 0.3,
    }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p6 THE PROMISE — she offers anything in return ═══
export function createPromiseScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addStars(b, g, { channel: 'openSky', quality, n: 60 }),
    addMoon(b, g, { pos: V3(-0.02, PAGE_ASPECT * 0.42, 0.15), size: 0.17, channel: 'openSky' }),
    addMist(b, g, { channel: 'field', quality, layers: 4, width: 1.2, y: -HALF_H }),
    addRibbons(b, g, { channel: 'violetVow', quality, n: 5, color: 0xb084e0, hue: 'rgba(176,132,224,0.85)', y: 0.06, amp: 0.06, width: 0.85 }),
    addSparkStream(b, g, { channel: 'violetVow', quality, from: V3(0.16, 0.0, 0.07), to: V3(-0.36, 0.12, 0.12), hue: 'rgba(196,160,240,1)', color: 0xc4a0f0, n: 34 }),
    addAura(b, g, { channel: 'handsMeet', x: 0.02, y: -0.04, hue: 'rgba(214,196,252,0.9)', color: 0xd6c4fc, w: 0.16, h: 0.16, strength: 0.2 }),
    addAura(b, g, { channel: 'sealed', x: -0.1, y: -0.05, hue: 'rgba(196,214,246,0.9)', color: 0xbcd2f2, w: 0.14, h: 0.26, strength: 0.14 }),
    addAura(b, g, { channel: 'sealed', x: 0.16, y: -0.02, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.18, h: 0.36, strength: 0.16 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p7 THE WITCH VANISHES — and so do the nightmares ═══
export function createVanishScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.02, PAGE_ASPECT * 0.36, 0.15), size: 0.11, channel: 'stillThere' }),
    addTreeField(b, g, { channel: 'stillThere', quality, bands: 3, color: 0x0e1a2a, spread: 1.5 }),
    addMist(b, g, { channel: 'stillThere', overflowChannel: 'relief', quality, layers: 5, width: 1.0 }),
    // she was here — a violet presence that dissolves outward into gold
    addAura(b, g, { channel: 'sheWasHere', x: 0.2, y: 0.0, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.2, h: 0.36, strength: 0.2 }),
    addSparkStream(b, g, { channel: 'dissolve', quality, from: V3(0.2, 0.0, 0.07), to: V3(0.62, 0.16, 0.18), hue: 'rgba(255,222,160,1)', color: 0xffdea0, n: 40, size: 0.026 }),
    addFireflies(b, g, { channel: 'goldEmbers', gatherChannel: 'relief', quality, n: 30, spread: 1.0 }),
    addAura(b, g, { channel: 'aloneAndFree', x: -0.02, y: -HALF_H + 0.16, hue: 'rgba(206,224,250,0.9)', color: 0xcee0fa, w: 0.24, h: 0.26, strength: 0.14 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p8 EMPTINESS — the nightmares are gone and nothing replaced them ═══
export function createEmptinessScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.06, PAGE_ASPECT * 0.3, 0.14), size: 0.13, channel: 'coldMoon' }),
    addShaft(b, g, { x: 0.04, y: -0.02, channel: 'coldMoon', w: 0.26, h: PAGE_ASPECT }),
    addMist(b, g, { channel: 'hollow', overflowChannel: 'nothingComes', quality, layers: 4, width: 0.95, color: 'rgba(206,214,230,0.45)' }),
    // a wash that drains the air rather than colouring it
    addWash(b, g, { channel: 'hollow', hue: 'rgba(120,134,164,0.6)', color: 0x7886a4, max: 0.6, strength: 0.1 }),
    addMotes(b, g, { channel: 'nothingComes', quality, n: 22, hue: 'rgba(198,208,228,1)', color: 0xc6d0e4, size: 0.018, rise: 0.5 }),
    addAura(b, g, { channel: 'grown', x: -0.05, y: -0.04, hue: 'rgba(214,226,248,0.9)', color: 0xd6e2f8, w: 0.16, h: 0.4, strength: 0.12 }),
    addForwardShadow(b, g, { channel: 'nothingComes', x: -0.05, w: 0.24, h: 0.46 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p9 SECOND MEETING — the witch returns under a pale blue moon ═══
export function createSecondMeetingScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(-0.02, PAGE_ASPECT * 0.38, 0.16), size: 0.15, channel: 'paleMoon' }),
    addShaft(b, g, { x: -0.02, y: 0.0, channel: 'paleMoon', w: 0.3 }),
    addTreeField(b, g, { channel: 'forestAgain', quality, bands: 4, color: 0x0c1626, spread: 1.6 }),
    addCanopy(b, g, { channel: 'forestAgain', count: 2 }),
    addMist(b, g, { channel: 'forestAgain', overflowChannel: 'shePresent', quality, layers: 5, width: 1.0 }),
    addFireflies(b, g, { channel: 'forestAgain', gatherChannel: 'shePresent', quality, n: 22 }),
    addAura(b, g, { channel: 'sheStands', x: -0.08, y: -0.02, hue: 'rgba(214,226,248,0.9)', color: 0xd6e2f8, w: 0.16, h: 0.36, strength: 0.15 }),
    addAura(b, g, { channel: 'shePresent', x: 0.14, y: 0.0, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.2, h: 0.4, strength: 0.2 }),
    addRings(b, g, { channel: 'shePresent', pos: V3(0.14, 0.0, 0.09), n: 2, base: 0.26 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p10 THE QUESTION — why am I still not happy? ═══
export function createQuestionScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addMoon(b, g, { pos: V3(0.1, PAGE_ASPECT * 0.36, 0.15), size: 0.14, channel: 'facing' }),
    addTreeField(b, g, { channel: 'facing', quality, bands: 3, color: 0x0d1828, spread: 1.5 }),
    addMist(b, g, { channel: 'facing', quality, layers: 4, width: 1.0 }),
    addAura(b, g, { channel: 'sheAsks', x: -0.14, y: -0.02, hue: 'rgba(214,226,248,0.9)', color: 0xd6e2f8, w: 0.16, h: 0.38, strength: 0.16 }),
    addAura(b, g, { channel: 'sheListens', x: 0.16, y: 0.0, hue: 'rgba(158,124,216,0.9)', color: 0x9a7cd8, w: 0.2, h: 0.4, strength: 0.16 }),
    // the question hangs in the gap between them
    addSparkStream(b, g, { channel: 'theGap', quality, from: V3(-0.12, 0.0, 0.07), to: V3(0.12, 0.02, 0.09), hue: 'rgba(206,224,250,1)', color: 0xcee0fa, n: 22, size: 0.024 }),
    addMotes(b, g, { channel: 'unanswered', quality, n: 24, hue: 'rgba(178,150,226,1)', color: 0xb296e2, size: 0.022, rise: 0.4 }),
    addWash(b, g, { channel: 'unanswered', hue: 'rgba(120,100,180,0.6)', color: 0x7864b4, max: 0.45, strength: 0.08 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p11 VIOLET MOON — the moon remembers, and the world changes with it ═══
// The event: memory enters the moon from inside, and the change then TRAVELS
// outward as a visible front that recolours everything it passes.
export function createVioletMoonScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const moonPos = V3(0, PAGE_ASPECT * 0.06, 0.16);
  const moonRig = addRig(b, g, {
    page: 11, character: 'sky',
    perf: { presence: 'blueMoon', breathe: 'blueMoon', contract: 'memoryRings', glow: 'violetSeep', tint: 'violetSeep' },
  });
  const layers: Layer[] = [
    addStars(b, g, { channel: 'blueMoon', quality, n: 50 }),
    // The page's own painted moon, cut from the artwork: it breathes, CONTRACTS
    // once as the memory reaches its core, then releases. The procedural moon
    // behind it supplies the halo and the violet that soaks in from within.
    moonRig,
    addMoon(b, g, { pos: moonPos, size: 0.24, channel: 'blueMoon', violetChannel: 'violetSeep', haloScale: 2.4 }),
    // memory arriving INTO the moon from the space around it — the cause
    addTransfer(b, g, {
      channel: 'violetSeep', quality,
      from: () => V3(-0.5, -0.2, 0.06), to: () => moonPos,
      hue: 'rgba(178,140,228,1)', color: 0xb28ce4, n: 26, size: 0.024, bow: 0.2, speed: 0.2,
    }),
    addTransfer(b, g, {
      channel: 'violetSeep', quality,
      from: () => V3(0.52, -0.18, 0.06), to: () => moonPos,
      hue: 'rgba(178,140,228,1)', color: 0xb28ce4, n: 26, size: 0.024, bow: -0.2, speed: 0.22,
    }),
    addRings(b, g, { channel: 'memoryRings', pos: moonPos, n: 4, base: 0.32 }),
    // THE EVENT: the change leaves the moon and travels down through the world
    addWavefront(b, g, {
      channel: 'propagate', from: moonPos, to: V3(0, -HALF_H - 0.12, 0.05),
      hue: 'rgba(160,120,220,0.75)', color: 0xa078dc, width: 0.7, strength: 0.2,
    }),
    addWash(b, g, { channel: 'propagate', pos: V3(0, PAGE_ASPECT * 0.06, 0.03), hue: 'rgba(150,110,210,0.7)', color: 0x9670d2, max: 0.55, strength: 0.13 }),
    addMotes(b, g, { channel: 'propagate', quality, n: 34 }),
    // the change does not stop at the horizon: it reaches the grass at our feet
    addGround(b, g, { channel: 'blueMoon', quality, tintChannel: 'propagate' }),
    addRibbons(b, g, { channel: 'propagate', quality, n: 3, color: 0xb08ce2, hue: 'rgba(176,140,226,0.8)', y: -0.1, amp: 0.04, width: 0.9 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p12 MEMORIES — pain, regret, betrayal, standing all around her ═══
export function createMemoriesScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addWash(b, g, { channel: 'gently', hue: 'rgba(120,96,180,0.6)', color: 0x7860b4, max: 0.5, strength: 0.1 }),
    addCrowd(b, g, { channel: 'theyGather', quality, n: 9 }),
    addRibbons(b, g, { channel: 'thePain', quality, n: 6, color: 0xb08ce2, hue: 'rgba(176,140,226,0.85)', y: 0.08, amp: 0.07, width: 0.9 }),
    addMotes(b, g, { channel: 'thePain', quality, n: 36, size: 0.026 }),
    addAura(b, g, { channel: 'sheStandsAmong', x: 0.0, y: -0.04, hue: 'rgba(226,232,250,0.9)', color: 0xe2e8fa, w: 0.14, h: 0.3, strength: 0.12 }),
    addRings(b, g, { channel: 'allOfIt', pos: V3(0, -0.02, 0.08), n: 3, base: 0.36 }),
    addForwardShadow(b, g, { channel: 'allOfIt', x: 0, w: 0.28, h: 0.4 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p13 STRENGTH — those who carry it become stronger ═══
export function createStrengthScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addWash(b, g, { channel: 'kneeling', hue: 'rgba(140,116,200,0.6)', color: 0x8c74c8, max: 0.4, strength: 0.09 }),
    addCrowd(b, g, { channel: 'carried', quality, n: 6 }),
    addShaft(b, g, { x: 0.02, y: 0.06, channel: 'risingLight', w: 0.2, h: PAGE_ASPECT * 1.1, color: 'rgba(226,214,255,0.75)' }),
    addSparkStream(b, g, { channel: 'risingLight', quality, from: V3(0.02, -0.1, 0.07), to: V3(0.02, 0.3, 0.16), hue: 'rgba(226,214,255,1)', color: 0xe2d6ff, n: 34, size: 0.024 }),
    addLightThreads(b, g, { channel: 'becomesStrength', quality, n: 5, hue: 'rgba(214,204,252,0.8)', color: 0xd6ccfc }),
    addAura(b, g, { channel: 'reward', x: 0.02, y: -0.06, hue: 'rgba(236,232,255,0.9)', color: 0xece8ff, w: 0.2, h: 0.24, strength: 0.16 }),
    addMotes(b, g, { channel: 'reward', quality, n: 28, hue: 'rgba(226,214,255,1)', color: 0xe2d6ff, size: 0.022, rise: 0.45 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p14 OVERCOME — do not erase it. overcome it. ═══
export function createOvercomeScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const eyes = V3(0.0, 0.04, 0.12);
  const layers: Layer[] = [
    addWash(b, g, { channel: 'sheSpeaks', pos: V3(0, 0.02, 0.03), hue: 'rgba(130,96,196,0.65)', color: 0x8260c4, max: 0.5, strength: 0.11 }),
    addRings(b, g, { channel: 'halo', pos: eyes, n: 4, base: 0.4, hue: 'rgba(196,160,244,0.9)', color: 0xc4a0f4 }),
    addRibbons(b, g, { channel: 'herWords', quality, n: 6, color: 0xc4a0f4, hue: 'rgba(196,160,244,0.85)', y: 0.0, amp: 0.08, width: 1.0 }),
    addSparkStream(b, g, { channel: 'herWords', quality, from: eyes, to: V3(-0.5, -0.1, 0.2), hue: 'rgba(214,180,252,1)', color: 0xd6b4fc, n: 30 }),
    addSparkStream(b, g, { channel: 'orStayAChild', quality, from: eyes, to: V3(0.52, -0.12, 0.2), hue: 'rgba(214,180,252,1)', color: 0xd6b4fc, n: 30 }),
    addMotes(b, g, { channel: 'orStayAChild', quality, n: 32, size: 0.026 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p15 RELEASE — “thank you”, and she is freed ═══
export function createReleaseScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addTreeField(b, g, { channel: 'quietForest', quality, bands: 3, color: 0x1a2030, spread: 1.5, leafy: false }),
    addMist(b, g, { channel: 'quietForest', overflowChannel: 'freed', quality, layers: 5, width: 1.05, color: 'rgba(214,220,238,0.5)' }),
    addLightThreads(b, g, { channel: 'threadsRise', quality, n: 7 }),
    addAura(b, g, { channel: 'sheSpeaksThanks', x: -0.04, y: -0.02, hue: 'rgba(226,234,252,0.9)', color: 0xe2eafc, w: 0.18, h: 0.38, strength: 0.16 }),
    addSparkStream(b, g, { channel: 'freed', quality, from: V3(0.04, 0.02, 0.08), to: V3(0.6, -0.02, 0.18), hue: 'rgba(214,190,250,1)', color: 0xd6befa, n: 36, size: 0.026 }),
    addRibbons(b, g, { channel: 'freed', quality, n: 4, color: 0xd6befa, hue: 'rgba(214,190,250,0.85)', y: -0.04, amp: 0.05, width: 0.95 }),
    addMotes(b, g, { channel: 'lighter', quality, n: 26, hue: 'rgba(232,238,255,1)', color: 0xe8eeff, size: 0.02, rise: 0.4 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p16 HER OWN DREAM — she walks forward, unafraid ═══
export function createDreamScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();
  const layers: Layer[] = [
    addTreeField(b, g, { channel: 'noLongerAfraid', quality, bands: 3, color: 0x1c2230, spread: 1.6, leafy: false }),
    addMist(b, g, { channel: 'noLongerAfraid', overflowChannel: 'forward', quality, layers: 5, width: 1.05, color: 'rgba(220,224,240,0.5)' }),
    addShaft(b, g, { x: 0.0, y: 0.08, channel: 'herLight', w: 0.4, h: PAGE_ASPECT * 1.1, color: 'rgba(236,232,255,0.7)' }),
    // the veil of light around her, opening outward like wings
    addRibbons(b, g, { channel: 'theVeil', quality, n: 6, color: 0xe0d4ff, hue: 'rgba(224,212,255,0.9)', y: -0.01, amp: 0.05, width: 1.0 }),
    addSparkStream(b, g, { channel: 'theVeil', quality, from: V3(0.0, 0.0, 0.08), to: V3(-0.58, 0.04, 0.2), hue: 'rgba(232,224,255,1)', color: 0xe8e0ff, n: 30 }),
    addSparkStream(b, g, { channel: 'theVeil', quality, from: V3(0.0, 0.0, 0.08), to: V3(0.58, 0.04, 0.2), hue: 'rgba(232,224,255,1)', color: 0xe8e0ff, n: 30 }),
    addAura(b, g, { channel: 'herOwnDream', x: 0.0, y: -0.02, hue: 'rgba(240,238,255,0.9)', color: 0xf0eeff, w: 0.2, h: 0.4, strength: 0.18 }),
    addLightThreads(b, g, { channel: 'forward', quality, n: 5 }),
    addForwardShadow(b, g, { channel: 'forward', x: 0, w: 0.3, h: 0.42 }),
  ];
  return composeScene(g, b, layers);
}

// ═══ p17 THE CYCLE — she became the one who was waiting ═══
// The event, made literal: the departing girl's light DRAINS out of her, travels
// back along a thread, and is received by the one who stayed — whose violet
// grows by exactly what the girl loses. The role is being handed over.
export function createCycleScene({ quality }: Opts): StoryScene {
  const g = new THREE.Group(); const b = new Bag();

  // far away, walking off: small, cool, fading
  // She walks away: two steps, hair and dress trailing, growing fainter.
  const girl = addRig(b, g, {
    page: 17, character: 'girl', facing: 1,
    perf: {
      presence: 'departure', breathe: 'departure', lean: 'departure',
      step: 'departure', sway: 'openingMist', glow: 'departure',
      drain: 'watcherViolet', recede: 'continuation',
    },
  });
  // She stays: the cloak reshapes, the hand rises, the posture becomes the
  // witch's. Nothing flashes — it is only obvious in hindsight.
  const watcher = addRig(b, g, {
    page: 17, character: 'witch', facing: 1,
    perf: {
      presence: 'departure', breathe: 'departure', sway: 'openingMist',
      reach: 'continuation', glow: 'watcherViolet', tint: 'watcherViolet',
      becoming: 'watcherViolet',
    },
    rimColor: 0x9a7cd8, rimHue: 'rgba(158,124,216,0.9)',
  });

  const layers: Layer[] = [
    addStars(b, g, { channel: 'departure', quality, n: 46 }),
    addMoon(b, g, { pos: V3(0.04, PAGE_ASPECT * 0.28, 0.14), size: 0.15, channel: 'moonReturns' }),
    addTreeField(b, g, { channel: 'departure', quality, bands: 3, color: 0x101a2c, spread: 1.6 }),
    addMist(b, g, { channel: 'openingMist', overflowChannel: 'continuation', quality, layers: 5, width: 1.1 }),
    watcher,
    girl,
    // THE REVEAL: what the girl carried travels back to the one who stayed
    addTransfer(b, g, {
      channel: 'watcherViolet', quality,
      from: () => girl.anchors.chest, to: () => watcher.anchors.chest,
      hue: 'rgba(190,152,240,1)', color: 0xbe98f0, n: 38, size: 0.034, bow: 0.14, speed: 0.18,
    }),
    addRings(b, g, { channel: 'watcherViolet', pos: V3(-0.235, -0.04, 0.06), n: 3, base: 0.26 }),
    // and it reaches past the page: the next wish is already out there
    addTransfer(b, g, {
      channel: 'continuation', quality,
      from: () => watcher.anchors.hand, to: () => V3(0.72, -0.06, 0.2),
      hue: 'rgba(176,140,226,1)', color: 0xb08ce2, n: 22, size: 0.024, bow: -0.16, speed: 0.16,
    }),
    addMotes(b, g, { channel: 'continuation', quality, n: 26, size: 0.022 }),
  ];
  return composeScene(g, b, layers);
}
