// ────────────────────────────────────────────────────────────────
// ENTER THE WORLD — a procedural, navigable moonlit forest (Three.js).
// Not a photo on a sphere: ground, layered tree silhouettes, moon,
// stars, volumetric-ish fog, fireflies and a violet "memory" ribbon
// are all generated in code. A few story panels use the real page
// images as textures (allowed) and act as gaze-activated story points.
// ────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export interface StoryPoint {
  id: number;
  yaw: number; // radians, horizontal placement
  label: { en: string[]; jp: string[] };
  texture?: string; // optional page image used as a floating memory panel
}

export interface WorldOptions {
  quality: 'high' | 'low';
  reducedMotion: boolean;
  onStoryPoint: (id: number | null) => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class ImmersiveWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raf = 0;
  private clock = new THREE.Clock();
  private disposables: Array<{ dispose: () => void }> = [];
  private textures: THREE.Texture[] = [];

  // camera orientation
  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private gyroEnabled = false;
  private gyro = { alpha: 0, beta: 0, gamma: 0 };
  private screenAngle = 0;

  private fireflies?: THREE.Points;
  private fireflyBase?: Float32Array;
  private moonMat?: THREE.MeshBasicMaterial;
  private moonGlow?: THREE.Sprite;
  private ribbon?: THREE.Mesh;
  private points: StoryPoint[];
  private panels: { mesh: THREE.Object3D; pt: StoryPoint }[] = [];
  private gazeId: number | null = null;
  private gazeTime = 0;
  private activeId: number | null = null;
  private paused = false;

  constructor(private canvas: HTMLCanvasElement, points: StoryPoint[], private opts: WorldOptions) {
    this.points = points;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality === 'high', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality === 'low' ? 1.3 : 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.scene.fog = new THREE.FogExp2(0x0a0f1c, 0.03);
    this.scene.background = new THREE.Color(0x070b14);

    this.camera = new THREE.PerspectiveCamera(72, canvas.clientWidth / canvas.clientHeight, 0.1, 400);
    this.camera.position.set(0, 1.6, 0);

    this.build();
    this.bindInput();
  }

  // ── construction ──────────────────────────────────────
  private build() {
    this.addSky();
    this.addStars();
    this.addMoon();
    this.addGround();
    this.addTreeRings();
    this.addLowFog();
    this.addFireflies();
    this.addMemoryRibbon();
    this.addPanels();

    const amb = new THREE.AmbientLight(0x3a4a70, 1.1);
    const moonLight = new THREE.DirectionalLight(0xbcd2f2, 0.7);
    moonLight.position.set(6, 20, -14);
    this.scene.add(amb, moonLight);
  }

  private track<T extends { dispose?: () => void }>(obj: T): T {
    if (obj && typeof (obj as any).dispose === 'function') this.disposables.push(obj as any);
    return obj;
  }

  private addSky() {
    const geo = this.track(new THREE.SphereGeometry(300, 32, 16));
    const mat = this.track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color(0x0a1226) }, bottom: { value: new THREE.Color(0x131a2e) } },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float h = normalize(vP).y*0.5+0.5; gl_FragColor = vec4(mix(bottom, top, smoothstep(0.35,0.85,h)),1.0);} `,
      }),
    );
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private addStars() {
    const n = this.opts.quality === 'low' ? 700 : 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 260;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(clamp(Math.random() * 0.9 + 0.05, -1, 1));
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.8 + 12;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = this.track(new THREE.PointsMaterial({ color: 0xdce8fb, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
    this.scene.add(new THREE.Points(geo, mat));
  }

  private addMoon() {
    const geo = this.track(new THREE.CircleGeometry(9, 48));
    this.moonMat = this.track(new THREE.MeshBasicMaterial({ color: 0xdfe9fb, transparent: true, fog: false }));
    const moon = new THREE.Mesh(geo, this.moonMat);
    moon.position.set(-30, 42, -120);
    moon.lookAt(0, 1.6, 0);
    this.scene.add(moon);

    const glowTex = this.track(this.radialTexture('rgba(210,225,250,0.9)'));
    this.textures.push(glowTex);
    const spriteMat = this.track(new THREE.SpriteMaterial({ map: glowTex, color: 0xcfe0f6, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.moonGlow = new THREE.Sprite(spriteMat);
    this.moonGlow.scale.set(70, 70, 1);
    this.moonGlow.position.copy(moon.position);
    this.scene.add(this.moonGlow);
  }

  private addGround() {
    const geo = this.track(new THREE.CircleGeometry(120, 64));
    const tex = this.track(this.groundTexture());
    this.textures.push(tex);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    const mat = this.track(new THREE.MeshStandardMaterial({ map: tex, color: 0x1b2740, roughness: 0.85, metalness: 0.1 }));
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    // wet-ground reflection hint: a faint additive disc catching the moon
    const rGeo = this.track(new THREE.CircleGeometry(50, 48));
    const rTex = this.track(this.radialTexture('rgba(150,180,230,0.5)'));
    this.textures.push(rTex);
    const rMat = this.track(new THREE.MeshBasicMaterial({ map: rTex, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    const refl = new THREE.Mesh(rGeo, rMat);
    refl.rotation.x = -Math.PI / 2;
    refl.position.set(-14, 0.02, -40);
    this.scene.add(refl);
  }

  private addTreeRings() {
    const rings = [
      { radius: 26, count: this.opts.quality === 'low' ? 14 : 20, height: 34, color: 0x0c1220, opacity: 1 },
      { radius: 46, count: this.opts.quality === 'low' ? 16 : 26, height: 46, color: 0x0e1524, opacity: 0.95 },
      { radius: 78, count: this.opts.quality === 'low' ? 18 : 30, height: 60, color: 0x101a2c, opacity: 0.8 },
    ];
    const treeTex = this.track(this.treeTexture());
    this.textures.push(treeTex);
    for (const ring of rings) {
      const mat = this.track(new THREE.MeshBasicMaterial({ map: treeTex, transparent: true, opacity: ring.opacity, depthWrite: false, color: ring.color, fog: true }));
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2 + Math.random() * 0.12;
        const r = ring.radius * (0.85 + Math.random() * 0.3);
        const h = ring.height * (0.7 + Math.random() * 0.6);
        const w = h * 0.32;
        const geo = this.track(new THREE.PlaneGeometry(w, h));
        const tree = new THREE.Mesh(geo, mat);
        tree.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
        tree.lookAt(0, h / 2 - 1, 0);
        this.scene.add(tree);
      }
    }
  }

  private addLowFog() {
    const tex = this.track(this.radialTexture('rgba(200,214,240,0.6)'));
    this.textures.push(tex);
    const n = this.opts.quality === 'low' ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const geo = this.track(new THREE.PlaneGeometry(70, 34));
      const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.06 + Math.random() * 0.05, depthWrite: false, blending: THREE.AdditiveBlending }));
      const m = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 60;
      m.position.set(Math.cos(a) * r, 1.5 + Math.random() * 2, Math.sin(a) * r);
      m.userData.spin = (Math.random() - 0.5) * 0.02;
      m.userData.fog = true;
      m.lookAt(0, 2, 0);
      this.scene.add(m);
    }
  }

  private addFireflies() {
    const n = this.opts.quality === 'low' ? 90 : 200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 60;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.5 + Math.random() * 10;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    this.fireflyBase = pos.slice();
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = this.track(this.radialTexture('rgba(255,236,180,1)'));
    this.textures.push(tex);
    const mat = this.track(new THREE.PointsMaterial({ map: tex, color: 0xffe6a6, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  private addMemoryRibbon() {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const a = t * Math.PI * 3;
      const r = 10 + Math.sin(t * 6) * 5;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 3 + Math.sin(t * 8) * 3.5 + t * 4, Math.sin(a) * r - 18));
    }
    // @types/three 0.160 omits curve class declarations; runtime three has it.
    const curve = new (THREE as any).CatmullRomCurve3(pts);
    const geo = this.track(new THREE.TubeGeometry(curve, 160, 0.28, 8, false));
    const mat = this.track(new THREE.MeshBasicMaterial({ color: 0x9a7cd8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ribbon = new THREE.Mesh(geo, mat);
    this.scene.add(this.ribbon);
  }

  private addPanels() {
    const loader = new THREE.TextureLoader();
    for (const pt of this.points) {
      const group = new THREE.Group();
      const r = 34;
      const x = Math.cos(pt.yaw) * r;
      const z = Math.sin(pt.yaw) * r;
      group.position.set(x, 6.5, z);
      group.lookAt(0, 6.5, 0);

      // glowing marker (always present, subtle)
      const glowTex = this.track(this.radialTexture('rgba(180,200,240,0.9)'));
      this.textures.push(glowTex);
      const glowMat = this.track(new THREE.SpriteMaterial({ map: glowTex, color: 0xaec2f0, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(7, 7, 1);
      group.add(glow);
      group.userData.glow = glow;

      if (pt.texture) {
        const tex = loader.load(pt.texture, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
        });
        this.textures.push(tex);
        const geo = this.track(new THREE.PlaneGeometry(10.6, 6));
        const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.16, depthWrite: false }));
        const panel = new THREE.Mesh(geo, mat);
        group.add(panel);
        group.userData.panel = panel;
      }
      this.scene.add(group);
      this.panels.push({ mesh: group, pt });
    }
  }

  // ── procedural textures ───────────────────────────────
  private radialTexture(color: string): THREE.Texture {
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

  private treeTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 512;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 128, 512);
    g.fillStyle = '#000';
    // trunk
    g.beginPath();
    g.moveTo(58, 512);
    g.bezierCurveTo(52, 340, 60, 240, 62, 150);
    g.lineTo(66, 150);
    g.bezierCurveTo(70, 240, 76, 340, 70, 512);
    g.closePath();
    g.fill();
    // canopy blobs
    for (let i = 0; i < 26; i++) {
      const x = 64 + (Math.random() - 0.5) * 96;
      const y = 40 + Math.random() * 150;
      const r = 12 + Math.random() * 26;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // a few branches
    g.strokeStyle = '#000';
    g.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(64, 150 + i * 30);
      g.lineTo(64 + (Math.random() - 0.5) * 80, 120 + i * 26);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private groundTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0f1626';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const a = Math.random() * 0.5;
      g.fillStyle = `rgba(${40 + Math.random() * 40},${60 + Math.random() * 50},${70 + Math.random() * 50},${a})`;
      g.fillRect(x, y, 1.5, 1.5);
    }
    // mossy patches
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      g.fillStyle = `rgba(60,90,70,${0.05 + Math.random() * 0.08})`;
      g.beginPath();
      g.arc(x, y, 6 + Math.random() * 16, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  // ── input ─────────────────────────────────────────────
  private bindInput() {
    const el = this.canvas;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('click', this.onTap);
    window.addEventListener('resize', this.onResize);
  }

  private onDown = (e: PointerEvent) => {
    if (this.gyroEnabled) return;
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging || this.gyroEnabled) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.targetYaw -= dx * 0.0035;
    this.targetPitch = clamp(this.targetPitch - dy * 0.003, -0.5, 0.55);
  };
  private onUp = () => { this.dragging = false; };
  private onTap = () => {
    if (this.gazeId !== null) this.activate(this.gazeId);
  };
  private onResize = () => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  enableGyro(): boolean {
    if (this.gyroEnabled) return true;
    this.gyroEnabled = true;
    this.screenAngle = (screen.orientation?.angle ?? 0) * (Math.PI / 180);
    window.addEventListener('deviceorientation', this.onGyro, true);
    window.addEventListener('orientationchange', this.onOrient);
    return true;
  }

  private onOrient = () => { this.screenAngle = (screen.orientation?.angle ?? 0) * (Math.PI / 180); };
  private onGyro = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    this.gyro = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
  };

  // ── loop ──────────────────────────────────────────────
  start() {
    this.paused = false;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.paused) this.frame();
    };
    this.raf = requestAnimationFrame(loop);
  }
  pause() { this.paused = true; }
  resume() { this.paused = false; this.clock.getDelta(); }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (this.gyroEnabled) {
      // device orientation → yaw/pitch (portrait baseline, clamped, damped)
      const a = THREE.MathUtils.degToRad(this.gyro.alpha);
      const b = THREE.MathUtils.degToRad(this.gyro.beta);
      this.targetYaw = -a - this.screenAngle;
      this.targetPitch = clamp(b - Math.PI / 2, -0.5, 0.55);
    }
    const ease = this.opts.reducedMotion ? 1 : 0.09;
    this.yaw += (this.targetYaw - this.yaw) * ease;
    this.pitch += (this.targetPitch - this.pitch) * ease;
    // gentle idle drift when untouched and not on gyro
    if (!this.dragging && !this.gyroEnabled && !this.opts.reducedMotion) this.targetYaw += 0.0008;

    const dir = new THREE.Vector3(Math.cos(this.pitch) * Math.sin(this.yaw), Math.sin(this.pitch), Math.cos(this.pitch) * Math.cos(this.yaw));
    this.camera.lookAt(this.camera.position.clone().add(dir));

    // fireflies drift
    if (this.fireflies && this.fireflyBase && !this.opts.reducedMotion) {
      const arr = (this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = this.fireflyBase[i] + Math.sin(t * 0.6 + i) * 1.4;
        arr[i + 1] = this.fireflyBase[i + 1] + Math.sin(t * 0.9 + i * 0.3) * 0.8;
        arr[i + 2] = this.fireflyBase[i + 2] + Math.cos(t * 0.5 + i) * 1.4;
      }
      (this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.fireflies.material as THREE.PointsMaterial).opacity = 0.6 + 0.35 * Math.sin(t * 1.5);
    }
    if (this.ribbon && !this.opts.reducedMotion) this.ribbon.rotation.y = t * 0.03;
    if (this.moonGlow) (this.moonGlow.material as THREE.SpriteMaterial).opacity = 0.7 + 0.12 * Math.sin(t * 0.5);
    // very slow moon violet breathing
    if (this.moonMat) {
      const mix = 0.5 + 0.5 * Math.sin(t * 0.08);
      this.moonMat.color.setHSL(0.62 - mix * 0.05, 0.35, 0.86);
    }
    this.scene.traverse((o) => { if ((o as any).userData?.spin) o.rotation.z += (o as any).userData.spin * dt; });

    this.updateGaze(dir, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private updateGaze(dir: THREE.Vector3, dt: number) {
    let best: number | null = null;
    let bestDot = 0.986; // ~9.5° cone
    for (const p of this.panels) {
      const to = p.mesh.position.clone().sub(this.camera.position).normalize();
      const dot = to.dot(dir);
      const glow = p.mesh.userData.glow as THREE.Sprite | undefined;
      if (glow) (glow.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.lerp((glow.material as THREE.SpriteMaterial).opacity, dot > 0.96 ? 0.6 : 0.24, 0.1);
      if (dot > bestDot) { bestDot = dot; best = p.pt.id; }
    }
    if (best !== this.gazeId) { this.gazeId = best; this.gazeTime = 0; }
    if (best !== null) {
      this.gazeTime += dt;
      if (this.gazeTime > 2.2 && this.activeId !== best) this.activate(best);
    } else if (this.activeId !== null && bestDot < 0.9) {
      // looked away → clear after leaving cone
      this.activeId = null;
      this.opts.onStoryPoint(null);
    }
  }

  private activate(id: number) {
    this.activeId = id;
    this.opts.onStoryPoint(id);
  }

  setQuality(q: 'high' | 'low') {
    this.opts.quality = q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'low' ? 1.3 : 2));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('click', this.onTap);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('deviceorientation', this.onGyro, true);
    window.removeEventListener('orientationchange', this.onOrient);
    this.textures.forEach((t) => t.dispose());
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.scene.clear();
  }
}
