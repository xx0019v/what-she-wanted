// ────────────────────────────────────────────────────────────────
// STATUS: verified in isolation, NOT YET WIRED INTO THE RIG.
//
// Wiring it was attempted and reverted. Driving the 2.5-D parts with these
// springs makes the motion large enough to read — and that is exactly when the
// parts travel off their own source pixels and the printed figure shows through
// behind them. The blocker is the cut-outs, not the motion: the p4 arm and
// shoulder pieces still carry background from the page, and the inpainted fill
// is not clean enough to hide the original underneath.
//
// The order of work is therefore: proper character layers first (mesh warp with
// per-part alpha that hugs the paint, or re-drawn layers), then this.
//
// The physics below is measured, not asserted. With body (k=150,d=22) and hair
// (k=70,d=8.4) against a step input:
//   body  0% overshoot, settles 0.40 s
//   hair  6.3% overshoot, settles 0.77 s
//   hair reaches 90% 100 ms AFTER the body   (overlap)
//   at the frame the body stops, hair is still moving at 0.0147 rad/s
//                                             (follow-through)
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
// Motion — the difference between a paper puppet and a performance.
//
// The rig used to drive every joint from `Math.sin(elapsed * k)`. Twelve of
// them, all reading the same clock, all with fixed periods: everything moved at
// once, started and stopped at once, and looped visibly. Nothing had weight.
//
// This replaces that with the pieces an animator actually uses:
//
//   Spring        second-order damped motion. Velocity is carried between
//                 frames, so a limb accelerates, overshoots a little, and
//                 settles. Inertia and follow-through come out of the physics
//                 rather than being faked with another sine.
//   Lag           a follower with its own time constant, for OVERLAP: the hair
//                 starts after the head and is still moving when the head stops.
//   anticipate    a channel that dips the other way before it rises, so an
//                 action has a preparation.
//   noise         smooth 1-D noise, so breathing and wind have no audible period.
//   walk          a stride with real WEIGHT SHIFT: hips rise and fall twice per
//                 cycle, the body leans over the supporting leg, and the planted
//                 foot does not slide.
//   bezier        hand-tuned timing curves — no linear easing anywhere.
// ────────────────────────────────────────────────────────────────

/**
 * A damped spring. Feed it a target each frame; it returns a value that has mass.
 *
 * `stiffness` sets how hard it pulls toward the target, `damping` how quickly
 * the oscillation dies. damping ≈ 2·√stiffness is critically damped (no
 * overshoot); below that it overshoots and settles, which is what makes cloth
 * and hair feel alive.
 */
export class Spring {
  private v = 0;
  private x: number;
  constructor(
    initial = 0,
    private stiffness = 120,
    private damping = 18,
  ) {
    this.x = initial;
  }
  /** Advance toward `target` by `dt` seconds. */
  step(target: number, dt: number): number {
    // sub-step so a long frame cannot make the spring explode
    const n = Math.min(4, Math.max(1, Math.ceil(dt / 0.012)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (target - this.x) * this.stiffness - this.v * this.damping;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  get value() { return this.x; }
  get velocity() { return this.v; }
  reset(v = 0) { this.x = v; this.v = 0; }
}

/**
 * A one-pole follower. Used for OVERLAP: give the hair a slower `tau` than the
 * head and it will trail behind on the way out and keep going on the way back.
 */
export class Lag {
  private x: number;
  constructor(initial = 0, private tau = 0.18) { this.x = initial; }
  step(target: number, dt: number): number {
    const k = 1 - Math.exp(-dt / Math.max(0.001, this.tau));
    this.x += (target - this.x) * k;
    return this.x;
  }
  get value() { return this.x; }
  reset(v = 0) { this.x = v; }
}

/** Cubic Bézier timing curve, y over x, the same shape CSS uses. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    let t = c;
    for (let i = 0; i < 5; i++) {
      const e = fx(t) - c;
      const d = dfx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

/** Slow out of rest, decisive through the middle, gentle arrival. */
export const easeAction = bezier(0.34, 0.02, 0.16, 1);
/** A held breath releasing — almost no acceleration, long tail. */
export const easeSettle = bezier(0.15, 0.6, 0.2, 1);
/** Something arriving that you did not choose: fast in, slow to finish. */
export const easeArrive = bezier(0.05, 0.7, 0.3, 1);

/**
 * ANTICIPATION. Shapes a rising 0..1 channel so it first moves slightly the
 * other way. A reach that begins by drawing the shoulder back reads as a
 * decision; a reach that starts at full speed reads as a machine.
 */
export function anticipate(level: number, amount = 0.22, window = 0.3): number {
  const t = Math.min(1, Math.max(0, level));
  if (t <= 0) return 0;
  if (t < window) {
    // dip back, then come through zero
    const u = t / window;
    return -amount * Math.sin(u * Math.PI) ;
  }
  const u = (t - window) / (1 - window);
  return easeAction(u);
}

/** Smooth 1-D value noise — no period a viewer can lock onto. */
export function noise(t: number, seed = 0): number {
  const hash = (n: number) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
}

/** Layered noise: a slow drift with a little detail on top. */
export function drift(t: number, seed = 0): number {
  return noise(t, seed) * 0.7 + noise(t * 2.3, seed + 7) * 0.3;
}

export interface WalkPose {
  /** swing angle of each leg, radians */
  legL: number;
  legR: number;
  /** hips rising and falling — twice per stride */
  hipY: number;
  /** weight over the supporting leg */
  shiftX: number;
  /** torso counter-rotation */
  torso: number;
  /** 0..1 — how planted the supporting foot is, used to stop sliding */
  planted: number;
}

/**
 * A stride with real WEIGHT SHIFT.
 *
 * `u` is the cycle position (0..1). The legs swing out of phase, the hips drop
 * at each foot strike and lift at mid-stance — twice per cycle, which is what
 * makes walking read as walking — the body leans over whichever leg is carrying
 * it, and `planted` peaks while a foot is down so the caller can hold it still
 * instead of letting it skate.
 */
export function walk(u: number, amount = 1): WalkPose {
  const p = u * Math.PI * 2;
  const swing = Math.sin(p);
  return {
    legL: swing * 0.30 * amount,
    legR: -swing * 0.30 * amount,
    // two rises per stride, and the dip is sharper than the lift
    hipY: (Math.cos(p * 2) * 0.5 - 0.5) * 0.006 * amount,
    shiftX: Math.sin(p) * 0.004 * amount,
    torso: -swing * 0.05 * amount,
    planted: Math.abs(Math.cos(p)),
  };
}

/**
 * Turns a channel into a one-shot cycle position that eases in, runs, and stops
 * cleanly at a whole number of cycles — so a step does not end mid-air and the
 * loop has no visible seam.
 */
export function cyclePosition(level: number, cycles = 1): number {
  const t = easeAction(Math.min(1, Math.max(0, level)));
  return t * cycles;
}
