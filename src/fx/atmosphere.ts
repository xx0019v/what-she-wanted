// ────────────────────────────────────────────────────────────────
// Procedural atmosphere engine — the invisible layer the camera reveals.
// Everything here is generated in code (no images, no AI assets):
// fog, fireflies, memory particles, nightmare ribbons, violet swirls,
// gold dust, rising light. Rendered on a single 2D canvas above the page.
// ────────────────────────────────────────────────────────────────
import type { SceneMotion } from '../data/scenes';

type FxName = SceneMotion['fx'][number];

interface Particle {
  x: number; y: number; z: number; // z = depth 0..1 (parallax + speed)
  vx: number; vy: number; r: number; life: number; maxLife: number; hue: number; seed: number;
}

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export interface AtmosphereOptions {
  quality: 'high' | 'low';
  reducedMotion: boolean;
}

export class Atmosphere {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private t = 0;
  private last = 0;
  private fx: Set<FxName> = new Set();
  private focus: [number, number] = [0.5, 0.5];
  private opts: AtmosphereOptions;
  private tilt = { x: 0, y: 0 }; // -1..1 parallax input

  private fireflies: Particle[] = [];
  private memory: Particle[] = [];
  private dust: Particle[] = [];
  private ribbons: { phase: number; amp: number; y: number; speed: number; hue: number }[] = [];
  private figures: { x: number; scale: number; phase: number }[] = [];
  private stars: { x: number; y: number; r: number; seed: number; tw: number }[] = [];
  private paused = false;

  constructor(private canvas: HTMLCanvasElement, opts: AtmosphereOptions) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.opts = opts;
    this.resize();
  }

  setTilt(x: number, y: number) {
    this.tilt.x = x;
    this.tilt.y = y;
  }

  private count(base: number) {
    const q = this.opts.quality === 'low' ? 0.45 : 1;
    return Math.round(base * q);
  }

  setScene(fx: FxName[], focus: [number, number]) {
    this.fx = new Set(fx);
    this.focus = focus;
    this.seed();
  }

  private seed() {
    const { h } = this;
    this.fireflies = [];
    this.memory = [];
    this.dust = [];
    this.ribbons = [];
    this.figures = [];
    this.stars = [];

    // A faint night sky for any moonlit scene.
    if (this.fx.has('moonPulse') || this.fx.has('violetMoon') || this.fx.has('cycleGlow')) {
      const n = this.count(64);
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: Math.random(),
          y: Math.random() * 0.62,
          r: rand(0.4, 1.4),
          seed: rand(0, TAU),
          tw: rand(0.4, 1.3),
        });
      }
    }

    if (this.fx.has('fireflies')) {
      for (let i = 0; i < this.count(46); i++) {
        this.fireflies.push(this.mkFly());
      }
    }
    if (this.fx.has('memoryParticles') || this.fx.has('goldDust') || this.fx.has('risingLight') || this.fx.has('lightRibbons')) {
      for (let i = 0; i < this.count(60); i++) this.memory.push(this.mkMemory());
    }
    if (this.fx.has('goldDust')) {
      for (let i = 0; i < this.count(40); i++) this.dust.push(this.mkDust());
    }
    if (this.fx.has('nightmareRibbons')) {
      for (let i = 0; i < 5; i++) this.ribbons.push({ phase: rand(0, TAU), amp: rand(h * 0.03, h * 0.08), y: rand(h * 0.2, h * 0.75), speed: rand(0.06, 0.14), hue: 250 });
    }
    if (this.fx.has('violetSwirl') || this.fx.has('cycleGlow')) {
      for (let i = 0; i < 3; i++) this.ribbons.push({ phase: rand(0, TAU), amp: rand(h * 0.04, h * 0.1), y: rand(h * 0.25, h * 0.6), speed: rand(0.05, 0.1), hue: 268 });
    }
    if (this.fx.has('memoryFigures')) {
      const n = this.count(6);
      for (let i = 0; i < n; i++) this.figures.push({ x: rand(0.06, 0.94), scale: rand(0.5, 1), phase: rand(0, TAU) });
    }
  }

  private mkFly(): Particle {
    const z = Math.random();
    return { x: Math.random() * this.w, y: Math.random() * this.h, z, vx: rand(-6, 6) * (0.3 + z), vy: rand(-4, 4) * (0.3 + z), r: rand(0.6, 2.1) * (0.5 + z), life: rand(0, 4), maxLife: rand(3, 6), hue: rand(38, 52), seed: rand(0, TAU) };
  }
  private mkMemory(): Particle {
    const z = Math.random();
    return { x: Math.random() * this.w, y: this.h * rand(0.3, 1), z, vx: rand(-4, 4), vy: rand(-14, -4) * (0.4 + z), r: rand(0.6, 2) * (0.5 + z), life: rand(0, 5), maxLife: rand(4, 9), hue: rand(255, 280), seed: rand(0, TAU) };
  }
  private mkDust(): Particle {
    const z = Math.random();
    return { x: Math.random() * this.w, y: Math.random() * this.h, z, vx: rand(-3, 3), vy: rand(-8, -1), r: rand(0.5, 1.6), life: rand(0, 3), maxLife: rand(3, 6), hue: 46, seed: rand(0, TAU) };
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.quality === 'low' ? 1.3 : 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    this.paused = false;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (this.paused) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.05) dt = 0.05;
      this.t += dt;
      this.render(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  private render(dt: number) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const tx = this.tilt.x;
    const ty = this.tilt.y;

    if (this.stars.length) this.drawStars(tx, ty);
    if (this.fx.has('fog')) this.drawFog(tx, ty);
    if (this.fx.has('violetMoon') || this.fx.has('moonPulse')) this.drawMoonGlow();
    this.drawRibbons(dt, tx);
    if (this.fx.has('memoryFigures')) this.drawFigures();
    this.drawParticles(this.memory, dt, tx, ty, 'memory');
    this.drawParticles(this.dust, dt, tx, ty, 'dust');
    this.drawParticles(this.fireflies, dt, tx, ty, 'fly');
    if (this.fx.has('lightPath')) this.drawLightPath();
    if (this.fx.has('desaturate')) this.drawDesaturate();
  }

  private drawFog(tx: number, ty: number) {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const layers = this.opts.quality === 'low' ? 2 : 3;
    for (let i = 0; i < layers; i++) {
      const depth = (i + 1) / layers;
      const speed = 0.02 + i * 0.014;
      const ox = Math.sin(this.t * speed) * w * 0.06 + tx * 26 * depth;
      const oy = Math.cos(this.t * speed * 0.7) * h * 0.02 + ty * 14 * depth;
      const cy = h * (0.72 - i * 0.12) + oy;
      const g = ctx.createRadialGradient(w * 0.5 + ox, cy, 0, w * 0.5 + ox, cy, w * (0.62 + i * 0.12));
      const a = 0.05 + 0.03 * (layers - i);
      g.addColorStop(0, `rgba(190,210,240,${a})`);
      g.addColorStop(1, 'rgba(190,210,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  private drawStars(tx: number, ty: number) {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const s of this.stars) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(this.t * s.tw + s.seed));
      const x = s.x * w + tx * 6 * s.r;
      const y = s.y * h + ty * 4 * s.r;
      const a = twinkle * 0.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 3);
      g.addColorStop(0, `rgba(226,236,250,${a})`);
      g.addColorStop(1, 'rgba(226,236,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s.r * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMoonGlow() {
    const { ctx, w, h } = this;
    const violet = this.fx.has('violetMoon');
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.5);
    const [fx, fy] = this.focus;
    const cx = w * fx + this.tilt.x * 10;
    const cy = h * fy - h * 0.06;
    const r = Math.min(w, h) * (0.28 + pulse * 0.05);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    let discHue = 214;
    if (violet) {
      const mix = Math.min(1, this.t / 6); // 0->1 blue to violet over 6s
      const hue = 214 - mix * 46;
      discHue = hue;
      g.addColorStop(0, `hsla(${hue}, 60%, 82%, ${0.16 + pulse * 0.06})`);
      g.addColorStop(0.5, `hsla(${hue - 6}, 55%, 60%, 0.06)`);
      g.addColorStop(1, 'hsla(270,50%,40%,0)');
    } else {
      g.addColorStop(0, `rgba(205,221,242,${0.12 + pulse * 0.05})`);
      g.addColorStop(1, 'rgba(205,221,242,0)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Luminous disc core — a soft moon, not a hard circle.
    const dr = Math.min(w, h) * 0.05;
    const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, dr);
    if (violet) {
      disc.addColorStop(0, `hsla(${discHue}, 70%, 92%, ${0.42 + pulse * 0.12})`);
      disc.addColorStop(0.7, `hsla(${discHue}, 65%, 80%, 0.16)`);
      disc.addColorStop(1, `hsla(${discHue}, 60%, 70%, 0)`);
    } else {
      disc.addColorStop(0, `rgba(238,244,251,${0.4 + pulse * 0.12})`);
      disc.addColorStop(0.7, 'rgba(214,228,246,0.15)');
      disc.addColorStop(1, 'rgba(205,221,242,0)');
    }
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, dr, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawRibbons(_dt: number, tx: number) {
    if (!this.ribbons.length) return;
    const { ctx, w } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const rb of this.ribbons) {
      rb.phase += rb.speed * 0.016;
      const segs = this.opts.quality === 'low' ? 26 : 44;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const p = i / segs;
        const x = p * w;
        const wob = Math.sin(p * 6 + rb.phase) * rb.amp + Math.sin(p * 13 + rb.phase * 1.7) * rb.amp * 0.4;
        const y = rb.y + wob + tx * 12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const isDark = rb.hue < 260;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      if (isDark) {
        grad.addColorStop(0, 'rgba(20,16,40,0)');
        grad.addColorStop(0.5, 'rgba(46,36,86,0.5)');
        grad.addColorStop(1, 'rgba(20,16,40,0)');
      } else {
        grad.addColorStop(0, 'rgba(154,124,216,0)');
        grad.addColorStop(0.5, 'rgba(180,150,240,0.42)');
        grad.addColorStop(1, 'rgba(154,124,216,0)');
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = isDark ? 26 : 12;
      ctx.lineCap = 'round';
      ctx.filter = 'blur(6px)';
      ctx.stroke();
      ctx.filter = 'none';
    }
    ctx.restore();
  }

  private drawFigures() {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const f of this.figures) {
      f.phase += 0.005;
      const breathe = 0.4 + 0.3 * Math.sin(f.phase);
      const x = f.x * w + this.tilt.x * 18 * f.scale;
      const baseY = h * 0.8;
      const fh = h * 0.34 * f.scale;
      const g = ctx.createLinearGradient(x, baseY - fh, x, baseY);
      g.addColorStop(0, `rgba(168,140,224,${0.03 * breathe})`);
      g.addColorStop(0.6, `rgba(150,120,210,${0.12 * breathe})`);
      g.addColorStop(1, 'rgba(120,96,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      const bw = fh * 0.32;
      ctx.ellipse(x, baseY - fh * 0.5, bw, fh * 0.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(list: Particle[], dt: number, tx: number, ty: number, kind: 'fly' | 'memory' | 'dust') {
    if (!list.length) return;
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of list) {
      p.life += dt;
      if (p.life > p.maxLife) {
        Object.assign(p, kind === 'fly' ? this.mkFly() : kind === 'memory' ? this.mkMemory() : this.mkDust());
        continue;
      }
      const drift = kind === 'fly' ? Math.sin(this.t * 0.6 + p.seed) * 8 : 0;
      p.x += (p.vx + drift) * dt;
      p.y += p.vy * dt;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) { p.y = h + 20; }
      const px = p.x + tx * 30 * p.z;
      const py = p.y + ty * 20 * p.z;
      const fade = Math.sin((p.life / p.maxLife) * Math.PI);
      const twinkle = kind === 'fly' ? 0.5 + 0.5 * Math.sin(this.t * 3 + p.seed) : 1;
      const a = fade * twinkle * (kind === 'memory' ? 0.5 : 0.8);
      const r = p.r * (1 + p.z);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
      const light = kind === 'fly' ? '86%' : '78%';
      g.addColorStop(0, `hsla(${p.hue}, 90%, ${light}, ${a})`);
      g.addColorStop(1, `hsla(${p.hue}, 90%, ${light}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLightPath() {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.8);
    const g = ctx.createLinearGradient(w * 0.5, h, w * 0.5, h * 0.4);
    g.addColorStop(0, `rgba(210,224,246,${0.14 * pulse})`);
    g.addColorStop(1, 'rgba(210,224,246,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 60, h);
    ctx.lineTo(w * 0.5 + 60, h);
    ctx.lineTo(w * 0.5 + 8, h * 0.42);
    ctx.lineTo(w * 0.5 - 8, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawDesaturate() {
    // Slowly bleed saturation from the frame edges to express emptiness.
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.fireflies = [];
    this.memory = [];
    this.dust = [];
    this.ribbons = [];
    this.figures = [];
    this.stars = [];
  }
}
