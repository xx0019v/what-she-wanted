// ────────────────────────────────────────────────────────────────
// ENTER THE WORLD — a procedural, navigable moonlit forest (Three.js).
// This is the exhibition centrepiece: the world that always existed on the
// far side of the printed page. Everything is generated in code — no photos,
// no AI art, no stock models. The moon is a clear landmark; a moonlit path
// leads the eye; the girl (white) walks it while the witch (violet) waits
// among the trees. Look anywhere and the frame means something.
//
// Composition contract (why it reads well from any angle):
//   • The MOON is the visual anchor — big, breathing blue↔violet, framed by
//     a clearing cut through the tree ring so the sightline is never blocked.
//   • The GROUND is alive — a moonlit path, wet reflection, low fog, ground
//     embers and faint footprints. No dead black wells.
//   • PRESENCE, not models — girl and witch are luminous 2.5D silhouettes.
//   • A violet MEMORY RIBBON flows from the moon toward the path — a guide.
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

// The moon anchors the whole composition. Front-left, a little above the
// horizon, far enough to feel like sky. Camera opens facing it.
const MOON = new THREE.Vector3(-10, 30, -128);
const MOON_AZ = Math.atan2(MOON.x, MOON.z); // horizontal bearing to the moon

export class ImmersiveWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raf = 0;
  private clock = new THREE.Clock();
  private disposables: Array<{ dispose: () => void }> = [];
  private textures: THREE.Texture[] = [];

  // camera orientation
  private yaw = MOON_AZ;
  private pitch = 0.12;
  private targetYaw = MOON_AZ;
  private targetPitch = 0.12;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private gyroEnabled = false;
  private gyro = { alpha: 0, beta: 0, gamma: 0 };
  private screenAngle = 0;

  private fireflies?: THREE.Points;
  private fireflyBase?: Float32Array;
  private embers?: THREE.Points;
  private emberBase?: Float32Array;
  private moonMat?: THREE.MeshBasicMaterial;
  private moonGlow?: THREE.Sprite;
  private moonHalo?: THREE.Sprite;
  private moonBeam?: THREE.Mesh;
  private pathMat?: THREE.MeshBasicMaterial;
  private moonLight?: THREE.DirectionalLight;
  private ambient?: THREE.AmbientLight;
  private ribbon?: THREE.Mesh;
  private ribbonMat?: THREE.MeshBasicMaterial;
  private girl?: THREE.Sprite;
  private witch?: THREE.Sprite;
  private witchGlow?: THREE.Sprite;
  private fogPlanes: THREE.Mesh[] = [];
  private points: StoryPoint[];
  private panels: { mesh: THREE.Object3D; pt: StoryPoint }[] = [];
  private gazeId: number | null = null;
  private gazeTime = 0;
  private activeId: number | null = null;
  private paused = false;
  private violet = 0; // 0 = blue moon, 1 = violet moon (slow breath)

  constructor(private canvas: HTMLCanvasElement, points: StoryPoint[], private opts: WorldOptions) {
    this.points = points;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality === 'high', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality === 'low' ? 1.3 : 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.scene.fog = new THREE.FogExp2(0x0b1024, 0.02);
    this.scene.background = new THREE.Color(0x080b16);

    this.camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
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
    this.addMoonPath();
    this.addForest();
    this.addForegroundBranches();
    this.addLowFog();
    this.addFireflies();
    this.addGroundEmbers();
    this.addFootprints();
    this.addMemoryRibbon();
    this.addCharacters();
    this.addPanels();

    this.ambient = new THREE.AmbientLight(0x415577, 1.25);
    this.moonLight = new THREE.DirectionalLight(0xbcd2f2, 0.8);
    this.moonLight.position.copy(MOON);
    this.scene.add(this.ambient, this.moonLight);
  }

  private track<T extends { dispose?: () => void }>(obj: T): T {
    if (obj && typeof (obj as any).dispose === 'function') this.disposables.push(obj as any);
    return obj;
  }

  private addSky() {
    const geo = this.track(new THREE.SphereGeometry(320, 32, 16));
    // Deep indigo overhead settling into a violet-tinged horizon — the sky
    // "remembers" the violet moon at its rim.
    const mat = this.track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(0x080b1c) },
          mid: { value: new THREE.Color(0x141a34) },
          horizon: { value: new THREE.Color(0x241a44) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `
          varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
          void main(){
            float h = normalize(vP).y*0.5+0.5;
            vec3 c = mix(horizon, mid, smoothstep(0.28, 0.52, h));
            c = mix(c, top, smoothstep(0.52, 0.92, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private addStars() {
    // Clustered, not uniform — a few dense drifts and quiet gaps.
    const n = this.opts.quality === 'low' ? 620 : 1300;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    let i = 0;
    const clusters = 7;
    const centers: Array<[number, number]> = [];
    for (let c = 0; c < clusters; c++) centers.push([Math.random() * Math.PI * 2, 0.2 + Math.random() * 1.0]);
    while (i < n) {
      let th: number, ph: number;
      if (Math.random() < 0.6) {
        const [cth, cph] = centers[(Math.random() * clusters) | 0];
        th = cth + (Math.random() - 0.5) * 0.9;
        ph = clamp(cph + (Math.random() - 0.5) * 0.5, 0.05, 1.35);
      } else {
        th = Math.random() * Math.PI * 2;
        ph = Math.acos(clamp(Math.random() * 0.92 + 0.05, -1, 1));
      }
      const r = 280;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.85 + 10;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      size[i] = Math.random() < 0.12 ? 1.8 : 0.8;
      i++;
    }
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const mat = this.track(new THREE.PointsMaterial({ color: 0xdce8fb, size: 1.0, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
    this.scene.add(new THREE.Points(geo, mat));
  }

  private addMoon() {
    // Luminous disc (soft craters, no photoreal maria) + wide halo + glow core.
    const moonTex = this.track(this.moonTexture());
    this.textures.push(moonTex);
    const geo = this.track(new THREE.CircleGeometry(13, 64));
    this.moonMat = this.track(new THREE.MeshBasicMaterial({ map: moonTex, color: 0xe6eefc, transparent: true, fog: false, depthWrite: false }));
    const moon = new THREE.Mesh(geo, this.moonMat);
    moon.position.copy(MOON);
    moon.lookAt(0, 1.6, 0);
    this.scene.add(moon);

    const haloTex = this.track(this.radialTexture('rgba(206,224,250,0.9)'));
    this.textures.push(haloTex);
    this.moonHalo = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: haloTex, color: 0xbcd2f2, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) as THREE.SpriteMaterial);
    this.moonHalo.scale.set(92, 92, 1);
    this.moonHalo.position.copy(MOON).setZ(MOON.z - 1);
    this.scene.add(this.moonHalo);

    // A restrained core glow — enough to feel luminous, never a blown-out headlight.
    const glowTex = this.track(this.radialTexture('rgba(224,236,255,0.85)', '0.4'));
    this.textures.push(glowTex);
    this.moonGlow = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: glowTex, color: 0xdbe8fb, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) as THREE.SpriteMaterial);
    this.moonGlow.scale.set(30, 30, 1);
    this.moonGlow.position.copy(MOON).setZ(MOON.z + 1);
    this.scene.add(this.moonGlow);

    // A soft god-ray descending from the moon toward the clearing — faint,
    // so it reads as moonlight on mist, never a spotlight.
    const beamTex = this.track(this.beamTexture('rgba(200,220,250,0.5)'));
    this.textures.push(beamTex);
    const beamGeo = this.track(new THREE.PlaneGeometry(30, 96));
    this.moonBeam = new THREE.Mesh(beamGeo, this.track(new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    // Hang it just below the moon so the shaft falls toward the ground.
    this.moonBeam.position.set(MOON.x * 0.42, 8, MOON.z * 0.42);
    this.moonBeam.lookAt(this.camera.position);
    this.moonBeam.rotateZ(0.05);
    this.scene.add(this.moonBeam);
  }

  private addGround() {
    const geo = this.track(new THREE.CircleGeometry(150, 72));
    const tex = this.track(this.groundTexture());
    this.textures.push(tex);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    const mat = this.track(new THREE.MeshStandardMaterial({ map: tex, color: 0x22304c, roughness: 0.9, metalness: 0.12 }));
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // A broad, soft moonlit clearing so the centre is never a dead black well.
    const clrTex = this.track(this.radialTexture('rgba(150,178,226,0.5)'));
    this.textures.push(clrTex);
    const clrGeo = this.track(new THREE.CircleGeometry(70, 48));
    const clr = new THREE.Mesh(clrGeo, this.track(new THREE.MeshBasicMaterial({ map: clrTex, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending })));
    clr.rotation.x = -Math.PI / 2;
    clr.position.set(MOON.x * 0.18, 0.02, MOON.z * 0.18);
    this.scene.add(clr);
  }

  private addMoonPath() {
    // The wet reflection of the moon on the ground — reads as a path leading
    // toward it. This is the "少女の道" landmark.
    const tex = this.track(this.beamTexture('rgba(176,200,240,0.7)'));
    this.textures.push(tex);
    const len = 118;
    const geo = this.track(new THREE.PlaneGeometry(15, len));
    this.pathMat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    const path = new THREE.Mesh(geo, this.pathMat);
    path.rotation.x = -Math.PI / 2;
    // lay it from just in front of the camera toward the moon's bearing
    const midX = Math.sin(MOON_AZ) * (len * 0.42);
    const midZ = Math.cos(MOON_AZ) * (len * 0.42);
    path.position.set(midX, 0.03, midZ);
    path.rotation.z = -MOON_AZ;
    this.scene.add(path);
  }

  private addForest() {
    // Three depth rings, INSTANCED for cheap draw calls. Height/density vary,
    // and a clearing is cut toward the moon so the sightline stays open.
    const treeTex = this.track(this.treeTexture());
    this.textures.push(treeTex);
    const rings = [
      { radius: 24, count: this.opts.quality === 'low' ? 16 : 24, h: 30, color: 0x0a1020, opacity: 1, jitter: 0.32 },
      { radius: 44, count: this.opts.quality === 'low' ? 20 : 32, h: 44, color: 0x0d1424, opacity: 0.96, jitter: 0.42 },
      { radius: 74, count: this.opts.quality === 'low' ? 24 : 40, h: 62, color: 0x101a30, opacity: 0.82, jitter: 0.5 },
      { radius: 108, count: this.opts.quality === 'low' ? 22 : 34, h: 84, color: 0x121e38, opacity: 0.6, jitter: 0.6 },
    ];
    const CLEARING = 0.34; // radians half-width of the gap toward the moon
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (const ring of rings) {
      // pre-compute valid placements (skip the clearing toward the moon)
      const placements: Array<{ a: number; r: number; h: number; w: number }> = [];
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2 + (Math.random() - 0.5) * ring.jitter;
        // angular distance from the moon bearing
        let d = Math.abs(((a - MOON_AZ + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < CLEARING && ring.radius < 90) continue; // keep near/mid rings open; far ring frames the moon
        const r = ring.radius * (0.82 + Math.random() * 0.4);
        const h = ring.h * (0.62 + Math.random() * 0.7);
        placements.push({ a, r, h, w: h * (0.28 + Math.random() * 0.12) });
      }
      if (!placements.length) continue;
      const geo = this.track(new THREE.PlaneGeometry(1, 1));
      const mat = this.track(new THREE.MeshBasicMaterial({ map: treeTex, transparent: true, opacity: ring.opacity, depthWrite: false, color: ring.color, fog: true }));
      const inst = new THREE.InstancedMesh(geo, mat, placements.length);
      inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      placements.forEach((pl, i) => {
        p.set(Math.cos(pl.a) * pl.r, pl.h / 2 - 1, Math.sin(pl.a) * pl.r);
        // face the centre
        const angle = Math.atan2(p.x, p.z);
        q.setFromAxisAngle(up, angle);
        s.set(pl.w, pl.h, 1);
        m.compose(p, q, s);
        inst.setMatrixAt(i, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      this.scene.add(inst);
    }
  }

  private addForegroundBranches() {
    // Near-camera branches that frame the top of the view — and later part for
    // the page→world transition. Dark, no fog (they're "inside" with us).
    const tex = this.track(this.branchTexture());
    this.textures.push(tex);
    const specs = [
      { x: -11, y: 10, z: -9, rot: -0.6, scale: 15, flip: 1 },
      { x: 12, y: 11, z: -10, rot: 0.5, scale: 17, flip: -1 },
    ];
    for (const b of specs) {
      const geo = this.track(new THREE.PlaneGeometry(b.scale * b.flip, b.scale * 0.7));
      const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.94, depthWrite: false, color: 0x05070e, fog: false }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.rotation.z = b.rot;
      this.scene.add(mesh);
    }
  }

  private addLowFog() {
    const tex = this.track(this.radialTexture('rgba(202,216,242,0.6)'));
    this.textures.push(tex);
    const n = this.opts.quality === 'low' ? 7 : 12;
    for (let i = 0; i < n; i++) {
      const geo = this.track(new THREE.PlaneGeometry(80, 30));
      const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.05 + Math.random() * 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
      const mesh = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 70;
      mesh.position.set(Math.cos(a) * r, 1.2 + Math.random() * 2.4, Math.sin(a) * r);
      mesh.userData.spin = (Math.random() - 0.5) * 0.015;
      mesh.userData.fog = true;
      mesh.lookAt(0, 2, 0);
      this.scene.add(mesh);
      this.fogPlanes.push(mesh);
    }
  }

  private addFireflies() {
    const n = this.opts.quality === 'low' ? 110 : 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 66;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.6 + Math.random() * 12;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    this.fireflyBase = pos.slice();
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = this.track(this.radialTexture('rgba(255,236,180,1)'));
    this.textures.push(tex);
    const mat = this.track(new THREE.PointsMaterial({ map: tex, color: 0xffe6a6, size: 1.15, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  private addGroundEmbers() {
    // Low, slow motes hugging the path — cool memory-fragments near the ground.
    const n = this.opts.quality === 'low' ? 40 : 80;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // bias toward the path (moon bearing)
      const along = Math.random();
      const spread = (Math.random() - 0.5) * 26;
      const px = Math.sin(MOON_AZ) * along * 90 + Math.cos(MOON_AZ) * spread;
      const pz = Math.cos(MOON_AZ) * along * 90 - Math.sin(MOON_AZ) * spread;
      pos[i * 3] = px;
      pos[i * 3 + 1] = 0.15 + Math.random() * 1.2;
      pos[i * 3 + 2] = pz;
    }
    this.emberBase = pos.slice();
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = this.track(this.radialTexture('rgba(198,210,244,1)'));
    this.textures.push(tex);
    const mat = this.track(new THREE.PointsMaterial({ map: tex, color: 0xb9cdf2, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.embers = new THREE.Points(geo, mat);
    this.scene.add(this.embers);
  }

  private addFootprints() {
    // Faint pale marks receding along the path — someone walked here.
    const tex = this.track(this.radialTexture('rgba(180,200,236,0.8)'));
    this.textures.push(tex);
    const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
    const count = 9;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const along = 6 + t * 74;
      const side = (i % 2 === 0 ? 1 : -1) * 1.1;
      const px = Math.sin(MOON_AZ) * along + Math.cos(MOON_AZ) * side;
      const pz = Math.cos(MOON_AZ) * along - Math.sin(MOON_AZ) * side;
      const geo = this.track(new THREE.PlaneGeometry(1.5 * (1 - t * 0.6), 2.4 * (1 - t * 0.6)));
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -MOON_AZ;
      m.position.set(px, 0.04, pz);
      this.scene.add(m);
    }
  }

  private addMemoryRibbon() {
    // A violet ribbon that unspools from the moon and coils down toward the
    // path — the memory the world is made of, leading the eye home.
    const pts: THREE.Vector3[] = [];
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = t * Math.PI * 3.4;
      const r = 6 + (1 - t) * 22 + Math.sin(t * 7) * 4;
      const x = MOON.x * (1 - t) * 0.6 + Math.cos(a) * r * t;
      const z = MOON.z * (1 - t) * 0.5 + Math.sin(a) * r * t - 14;
      const y = MOON.y * (1 - t) * 0.7 + 3 + Math.sin(t * 9) * 3;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new (THREE as any).CatmullRomCurve3(pts);
    const geo = this.track(new THREE.TubeGeometry(curve, 200, 0.22, 8, false));
    this.ribbonMat = this.track(new THREE.MeshBasicMaterial({ color: 0x9a7cd8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.ribbon = new THREE.Mesh(geo, this.ribbonMat);
    this.scene.add(this.ribbon);
  }

  private addCharacters() {
    // Presence, not models. The girl (white) stands on the path facing the
    // moon; the witch (violet) waits half-hidden among the trees to one side.
    const girlTex = this.track(this.figureTexture('girl'));
    this.textures.push(girlTex);
    this.girl = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: girlTex, color: 0xdfe9fb, transparent: true, opacity: 0.9, depthWrite: false, fog: true })) as THREE.SpriteMaterial);
    this.girl.scale.set(4.2, 7.0, 1);
    // mid-distance along the path, a touch off the exact moon axis so she is
    // not swallowed by the beam
    const gAlong = 34;
    this.girl.position.set(Math.sin(MOON_AZ) * gAlong + 1.4, 3.2, Math.cos(MOON_AZ) * gAlong);
    this.scene.add(this.girl);

    // faint moon-glow rim behind her so she reads against the trees
    const rimTex = this.track(this.radialTexture('rgba(190,210,245,0.7)'));
    this.textures.push(rimTex);
    const rim = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: rimTex, color: 0xbcd2f2, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) as THREE.SpriteMaterial);
    rim.scale.set(9, 9, 1);
    rim.position.copy(this.girl.position).setY(3);
    this.scene.add(rim);

    const witchTex = this.track(this.figureTexture('witch'));
    this.textures.push(witchTex);
    this.witch = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: witchTex, color: 0x2a2140, transparent: true, opacity: 0.82, depthWrite: false, fog: true })) as THREE.SpriteMaterial);
    this.witch.scale.set(4.4, 8.2, 1);
    // off the path, among the mid trees, to the right of the moon bearing
    const wAz = MOON_AZ + 0.6;
    const wR = 34;
    this.witch.position.set(Math.sin(wAz) * wR, 3.6, Math.cos(wAz) * wR);
    this.scene.add(this.witch);

    const wGlowTex = this.track(this.radialTexture('rgba(158,124,216,0.9)'));
    this.textures.push(wGlowTex);
    this.witchGlow = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: wGlowTex, color: 0x9a7cd8, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) as THREE.SpriteMaterial);
    this.witchGlow.scale.set(12, 12, 1);
    this.witchGlow.position.copy(this.witch.position).setY(4);
    this.scene.add(this.witchGlow);
  }

  private addPanels() {
    // Optional floating memory panels (page art) — quiet, low opacity; gaze at
    // one and its caption rises. They sit above the ring so they don't fight
    // the ground composition.
    const loader = new THREE.TextureLoader();
    for (const pt of this.points) {
      const group = new THREE.Group();
      const r = 40;
      const x = Math.cos(pt.yaw) * r;
      const z = Math.sin(pt.yaw) * r;
      group.position.set(x, 9, z);
      group.lookAt(0, 9, 0);

      const glowTex = this.track(this.radialTexture('rgba(180,200,240,0.9)'));
      this.textures.push(glowTex);
      const glowMat = this.track(new THREE.SpriteMaterial({ map: glowTex, color: 0xaec2f0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) as THREE.SpriteMaterial;
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(6, 6, 1);
      group.add(glow);
      group.userData.glow = glow;

      if (pt.texture) {
        const tex = loader.load(pt.texture, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
        this.textures.push(tex);
        const geo = this.track(new THREE.PlaneGeometry(9.6, 5.4));
        const mat = this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.12, depthWrite: false, fog: false }));
        const panel = new THREE.Mesh(geo, mat);
        group.add(panel);
        group.userData.panel = panel;
      }
      this.scene.add(group);
      this.panels.push({ mesh: group, pt });
    }
  }

  // ── procedural textures ───────────────────────────────
  private radialTexture(color: string, mid = '1'): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, color);
    if (mid !== '1') grd.addColorStop(parseFloat(mid), color.replace(/[\d.]+\)$/, '0.35)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private moonTexture(): THREE.Texture {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    // soft luminous body
    const body = g.createRadialGradient(S * 0.44, S * 0.42, S * 0.05, S * 0.5, S * 0.5, S * 0.5);
    body.addColorStop(0, 'rgba(255,255,255,1)');
    body.addColorStop(0.55, 'rgba(226,236,252,0.98)');
    body.addColorStop(0.82, 'rgba(196,214,244,0.9)');
    body.addColorStop(1, 'rgba(196,214,244,0)');
    g.fillStyle = body;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    g.fill();
    // soft maria + craters give it "moon" character (low-contrast, not photoreal)
    g.globalCompositeOperation = 'source-atop';
    const maria: Array<[number, number, number]> = [
      [S * 0.42, S * 0.44, S * 0.2],
      [S * 0.6, S * 0.56, S * 0.16],
      [S * 0.52, S * 0.36, S * 0.12],
    ];
    for (const [x, y, r] of maria) {
      const mg = g.createRadialGradient(x, y, 0, x, y, r);
      mg.addColorStop(0, 'rgba(150,168,204,0.16)');
      mg.addColorStop(1, 'rgba(150,168,204,0)');
      g.fillStyle = mg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * S * 0.38;
      const x = S / 2 + Math.cos(a) * rr;
      const y = S / 2 + Math.sin(a) * rr;
      const cr = 3 + Math.random() * 14;
      const cg = g.createRadialGradient(x, y, 0, x, y, cr);
      cg.addColorStop(0, 'rgba(140,160,198,0.14)');
      cg.addColorStop(1, 'rgba(140,160,198,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.arc(x, y, cr, 0, Math.PI * 2);
      g.fill();
    }
    // gentle limb darkening — one edge falls into shadow so it reads spherical
    const limb = g.createRadialGradient(S * 0.4, S * 0.4, S * 0.28, S * 0.5, S * 0.5, S * 0.5);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(20,28,48,0.35)');
    g.fillStyle = limb;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private beamTexture(color: string): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d')!;
    const hx = g.createLinearGradient(0, 0, 64, 0);
    hx.addColorStop(0, 'rgba(0,0,0,0)');
    hx.addColorStop(0.5, color);
    hx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hx;
    g.fillRect(0, 0, 64, 256);
    const vy = g.createLinearGradient(0, 0, 0, 256);
    vy.addColorStop(0, 'rgba(0,0,0,1)');
    vy.addColorStop(0.12, 'rgba(0,0,0,0)');
    vy.addColorStop(0.7, 'rgba(0,0,0,0)');
    vy.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = vy;
    g.fillRect(0, 0, 64, 256);
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
    g.beginPath();
    g.moveTo(58, 512);
    g.bezierCurveTo(52, 340, 60, 240, 62, 150);
    g.lineTo(66, 150);
    g.bezierCurveTo(70, 240, 76, 340, 70, 512);
    g.closePath();
    g.fill();
    for (let i = 0; i < 28; i++) {
      const x = 64 + (Math.random() - 0.5) * 100;
      const y = 40 + Math.random() * 160;
      const r = 12 + Math.random() * 28;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#000';
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(64, 150 + i * 30);
      g.lineTo(64 + (Math.random() - 0.5) * 90, 120 + i * 26);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private branchTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = '#000';
    g.lineCap = 'round';
    // a limb crossing the top with a few twigs and leaf clusters
    const drawBranch = (x0: number, y0: number, x1: number, y1: number, w: number, depth: number) => {
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x0, y0);
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 30;
      const my = (y0 + y1) / 2 - Math.random() * 20;
      g.quadraticCurveTo(mx, my, x1, y1);
      g.stroke();
      if (depth > 0 && w > 1.5) {
        const n = 2 + ((Math.random() * 2) | 0);
        for (let i = 0; i < n; i++) {
          const t = 0.4 + Math.random() * 0.5;
          const bx = x0 + (x1 - x0) * t;
          const by = y0 + (y1 - y0) * t;
          drawBranch(bx, by, bx + (Math.random() - 0.5) * 90, by - 20 - Math.random() * 50, w * 0.55, depth - 1);
        }
      }
    };
    drawBranch(0, 58, 256, 42, 7, 3);
    // small elongated leaf clusters hugging the limb (not big round blobs)
    g.fillStyle = '#000';
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 256;
      const y = 24 + Math.random() * 64;
      const rx = 3 + Math.random() * 7;
      const ry = rx * (0.4 + Math.random() * 0.3);
      g.save();
      g.translate(x, y);
      g.rotate(Math.random() * Math.PI);
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private figureTexture(kind: 'girl' | 'witch'): THREE.Texture {
    const W = 128, H = 256;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const cx = W / 2;
    if (kind === 'girl') {
      // A small child, seen from behind on the path: rounded head with a short
      // bob, slim torso, a dress that flares only gently, thin legs. Read as a
      // girl — never a lamp. Feet sit at the bottom of the canvas.
      const top = 70; // head top
      g.fillStyle = 'rgba(14,18,30,0.9)';
      // hair / head (bob framing a small head)
      g.beginPath(); g.arc(cx, top + 16, 15, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(cx - 16, top + 12);
      g.quadraticCurveTo(cx - 18, top + 34, cx - 12, top + 40);
      g.lineTo(cx + 12, top + 40);
      g.quadraticCurveTo(cx + 18, top + 34, cx + 16, top + 12);
      g.quadraticCurveTo(cx, top - 4, cx - 16, top + 12);
      g.fill();
      // neck + shoulders + slim torso
      g.beginPath();
      g.moveTo(cx - 10, top + 40);
      g.lineTo(cx + 10, top + 40);
      g.lineTo(cx + 12, top + 96);
      g.lineTo(cx - 12, top + 96);
      g.closePath();
      g.fill();
      // gently flaring dress
      g.beginPath();
      g.moveTo(cx - 12, top + 92);
      g.lineTo(cx + 12, top + 92);
      g.quadraticCurveTo(cx + 20, top + 128, cx + 17, top + 150);
      g.quadraticCurveTo(cx, top + 158, cx - 17, top + 150);
      g.quadraticCurveTo(cx - 20, top + 128, cx - 12, top + 92);
      g.fill();
      // thin legs
      g.fillRect(cx - 8, top + 150, 6, 26);
      g.fillRect(cx + 2, top + 150, 6, 26);
      // pale moonlight rim down the right edge + hair crown
      g.strokeStyle = 'rgba(206,224,250,0.55)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx + 11, top + 44);
      g.lineTo(cx + 18, top + 130);
      g.stroke();
      g.beginPath(); g.arc(cx, top + 14, 15, -Math.PI * 0.45, Math.PI * 0.15); g.stroke();
    } else {
      // tall cloaked figure, pointed hat, faint violet rim
      g.fillStyle = 'rgba(16,12,26,0.94)';
      // hat
      g.beginPath();
      g.moveTo(cx, 8);
      g.lineTo(cx + 26, 60);
      g.lineTo(cx - 26, 60);
      g.closePath();
      g.fill();
      g.fillRect(cx - 34, 58, 68, 8);
      // head
      g.beginPath(); g.arc(cx, 74, 12, 0, Math.PI * 2); g.fill();
      // long cloak
      g.beginPath();
      g.moveTo(cx - 14, 84);
      g.lineTo(cx + 14, 84);
      g.lineTo(cx + 30, 244);
      g.quadraticCurveTo(cx, 254, cx - 30, 244);
      g.closePath();
      g.fill();
      // violet rim
      g.strokeStyle = 'rgba(158,124,216,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - 14, 86);
      g.lineTo(cx - 29, 240);
      g.stroke();
      g.beginPath();
      g.moveTo(cx, 10);
      g.lineTo(cx - 25, 59);
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
    g.fillStyle = '#141d30';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1100; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const a = Math.random() * 0.5;
      g.fillStyle = `rgba(${46 + Math.random() * 46},${64 + Math.random() * 54},${78 + Math.random() * 54},${a})`;
      g.fillRect(x, y, 1.6, 1.6);
    }
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      g.fillStyle = `rgba(64,96,76,${0.05 + Math.random() * 0.09})`;
      g.beginPath();
      g.arc(x, y, 6 + Math.random() * 18, 0, Math.PI * 2);
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
      const a = THREE.MathUtils.degToRad(this.gyro.alpha);
      const b = THREE.MathUtils.degToRad(this.gyro.beta);
      this.targetYaw = -a - this.screenAngle + MOON_AZ;
      this.targetPitch = clamp(b - Math.PI / 2, -0.5, 0.55);
    }
    const ease = this.opts.reducedMotion ? 1 : 0.09;
    this.yaw += (this.targetYaw - this.yaw) * ease;
    this.pitch += (this.targetPitch - this.pitch) * ease;
    if (!this.dragging && !this.gyroEnabled && !this.opts.reducedMotion) this.targetYaw += 0.0006;

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
    // ground embers rise slowly and recycle
    if (this.embers && this.emberBase && !this.opts.reducedMotion) {
      const arr = (this.embers.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] = this.emberBase[i] + ((t * 0.25 + i) % 3);
      }
      (this.embers.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
    if (this.ribbon && !this.opts.reducedMotion) this.ribbon.rotation.y = t * 0.02;
    for (const f of this.fogPlanes) if (f.userData.spin && !this.opts.reducedMotion) f.rotation.z += f.userData.spin * dt;

    // moon breathing + blue↔violet memory (very slow), propagated to light,
    // ribbon and path so the whole world "remembers" together.
    this.violet = 0.5 + 0.5 * Math.sin(t * 0.06);
    const v = this.violet;
    if (this.moonMat) this.moonMat.color.setHSL(0.62 - v * 0.06, 0.34 + v * 0.2, 0.86 - v * 0.05);
    if (this.moonGlow) {
      (this.moonGlow.material as THREE.SpriteMaterial).color.setHSL(0.62 - v * 0.05, 0.4 + v * 0.2, 0.8);
      (this.moonGlow.material as THREE.SpriteMaterial).opacity = 0.22 + 0.05 * Math.sin(t * 0.5);
    }
    if (this.moonHalo) (this.moonHalo.material as THREE.SpriteMaterial).opacity = 0.24 + 0.08 * Math.sin(t * 0.4);
    if (this.moonLight) this.moonLight.color.setHSL(0.62 - v * 0.05, 0.4, 0.78);
    if (this.ambient) this.ambient.color.setHSL(0.62 - v * 0.04, 0.28, 0.36);
    if (this.ribbonMat) this.ribbonMat.opacity = 0.4 + 0.18 * Math.sin(t * 0.5) + v * 0.1;
    if (this.pathMat) this.pathMat.opacity = 0.16 + 0.06 * Math.sin(t * 0.35);
    if (this.witchGlow) (this.witchGlow.material as THREE.SpriteMaterial).opacity = 0.22 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.7));

    // characters breathe faintly (no walk cycle — only the hint of a step)
    if (this.girl && !this.opts.reducedMotion) {
      this.girl.position.y = 2.8 + Math.sin(t * 0.8) * 0.06;
      (this.girl.material as THREE.SpriteMaterial).opacity = 0.86 + 0.08 * Math.sin(t * 0.6);
    }
    if (this.witch && !this.opts.reducedMotion) {
      (this.witch.material as THREE.SpriteMaterial).opacity = 0.72 + 0.12 * Math.sin(t * 0.5 + 1.5);
    }

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
      if (glow) (glow.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.lerp((glow.material as THREE.SpriteMaterial).opacity, dot > 0.96 ? 0.55 : 0.18, 0.1);
      if (dot > bestDot) { bestDot = dot; best = p.pt.id; }
    }
    if (best !== this.gazeId) { this.gazeId = best; this.gazeTime = 0; }
    if (best !== null) {
      this.gazeTime += dt;
      if (this.gazeTime > 2.2 && this.activeId !== best) this.activate(best);
    } else if (this.activeId !== null && bestDot < 0.9) {
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
