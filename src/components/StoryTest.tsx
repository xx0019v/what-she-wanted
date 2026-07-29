import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { StoryRuntime } from '../story/storyRuntime';
import { loadRigs } from '../story/rig';
import { PAGE_STORIES, storyForPage } from '../story/pageStories';
import { PAGE_ASPECT } from '../story/scenes';
import type { StoryStatus } from '../story/storyTypes';
import { StorySubtitle } from './StorySubtitle';
import type { Lang, Quality } from '../lib/prefs';

interface Props {
  lang: Lang;
  quality: Quality;
  reducedMotion: boolean;
  page: number;
  onExit: () => void;
}

/**
 * Camera-free story harness. Plays a page's story on a virtual printed page so
 * the timeline, phases, subtitle cues and the lost/re-acquire behaviour can be
 * inspected without a phone. Never part of the normal flow.
 */
export function StoryTest({ lang, quality, reducedMotion, page, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<StoryRuntime | null>(null);
  const [status, setStatus] = useState<StoryStatus | null>(null);
  const [fps, setFps] = useState(0);
  const [current, setCurrent] = useState(page);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.3 : 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.01, 50);

    // the surface + the printed page, so off-page overflow reads
    const surfaceMat = new THREE.MeshBasicMaterial({ color: 0x0b0f1c });
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), surfaceMat);
    surface.position.z = -0.01;
    scene.add(surface);

    const loader = new THREE.TextureLoader();
    const pageTex = loader.load(`${import.meta.env.BASE_URL}pages/${current}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
    const pageMat = new THREE.MeshBasicMaterial({ map: pageTex });
    const pagePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, PAGE_ASPECT), pageMat);
    scene.add(pagePlane);

    const anchor = new THREE.Group();
    scene.add(anchor);

    const runtime = new StoryRuntime({
      quality,
      reducedMotion,
      onStatus: (s) => setStatus(s),
    });
    runtimeRef.current = runtime;
    // the character rigs are cut from the page art; wait for their metadata so
    // the figures are part of the scene from its first frame
    let cancelled = false;
    loadRigs().then(() => {
      if (cancelled) return;
      const story = storyForPage(current);
      if (story) {
        runtime.mount(story, true);
        const g = runtime.sceneGroup;
        if (g) anchor.add(g);
      }
    });

    let yaw = 0.42, pitch = 0.3;
    let targetYaw = 0.42, targetPitch = 0.3;
    // ?cam=<distance> — pull in close to judge the character performance
    const camParam = Number(new URLSearchParams(location.search).get('cam'));
    const dist = Number.isFinite(camParam) && camParam > 0.3 ? camParam : 1.75;
    let dragging = false;
    let last = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { dragging = true; last = { x: e.clientX, y: e.clientY }; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetYaw += (e.clientX - last.x) * 0.005;
      targetPitch = Math.max(0.05, Math.min(0.9, targetPitch + (e.clientY - last.y) * 0.004));
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging = false; };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    let frames = 0;
    let fpsT = 0;
    // Headless/background safety net: rAF is throttled to zero when the page is
    // not visible (screenshot tools, background tabs), which would freeze the
    // story mid-beat. A timer keeps the timeline honest either way.
    let lastTick = performance.now();
    const tick = () => {
      const now = performance.now();
      // cap at 0.2s so a long stall can't jump the story, but don't clamp so
      // hard that a 100ms keep-alive tick makes narrative time crawl
      const dt = Math.min((now - lastTick) / 1000, 0.2);
      lastTick = now;
      return dt;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = tick();
      clock.getDelta();
      if (!dragging && !reducedMotion) targetYaw = 0.42 + Math.sin(clock.elapsedTime * 0.1) * 0.3;
      yaw += (targetYaw - yaw) * 0.06;
      pitch += (targetPitch - pitch) * 0.06;
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, 0.02, 0.05);
      runtime.update(dt);
      frames += 1; fpsT += dt;
      if (fpsT >= 0.4) { setFps(Math.round(frames / fpsT)); frames = 0; fpsT = 0; runtime.tickStatus(); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    // Runs only when rAF is being throttled (hidden page); harmless otherwise
    // because `tick()` returns ~0 dt when a frame has just run.
    const keepAlive = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        const dt = tick();
        runtime.update(dt);
        renderer.render(scene, camera);
        runtime.tickStatus();
      }
    }, 100);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(keepAlive);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      runtime.dispose();
      runtimeRef.current = null;
      pageTex.dispose(); pageMat.dispose(); surfaceMat.dispose();
      pagePlane.geometry.dispose(); surface.geometry.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [current, quality, reducedMotion]);

  const rt = () => runtimeRef.current;
  const nextPage = () => {
    const idx = PAGE_STORIES.findIndex((s) => s.pageNumber === current);
    setCurrent(PAGE_STORIES[(idx + 1) % PAGE_STORIES.length].pageNumber);
  };

  return (
    <div className="stage" role="region" aria-label="Story test">
      {/* keyed so switching page/quality gets a FRESH canvas — reusing one whose
          WebGL context was disposed throws "existing context of a different type" */}
      <canvas key={`${current}-${quality}`} ref={canvasRef} className="world-canvas" />
      <StorySubtitle cue={status?.subtitle ?? null} lang={lang} reducedMotion={reducedMotion} />

      <div className="ar-debug" role="status" aria-live="polite">
        <div className="row"><span>PAGE</span><b>p{status?.page ?? current}</b></div>
        <div className="row"><span>TARGET INDEX</span><b>{status?.targetIndex ?? '—'}</b></div>
        <div className="row"><span>STORY STATE</span><b data-s={status?.state === 'playing' ? 'found' : status?.state === 'paused' ? 'lost' : undefined}>{status?.state?.toUpperCase() ?? '—'}</b></div>
        <div className="row"><span>CURRENT PHASE</span><b>{status?.phase ?? '—'}</b></div>
        <div className="row"><span>ELAPSED</span><b>{status ? `${status.elapsed.toFixed(1)} / ${status.duration}s` : '—'}</b></div>
        <div className="row"><span>SUBTITLE CUE</span><b>{status?.subtitle ? `@${status.subtitle.at}s` : '—'}</b></div>
        <div className="row"><span>FOUND / LOST</span><b>{status?.foundCount ?? 0} / {status?.lostCount ?? 0}</b></div>
        <div className="row"><span>REACQUIRED</span><b>{status?.reacquireCount ?? 0}</b></div>
        <div className="row"><span>FPS</span><b>{fps}</b></div>
        <div className="ar-debug-actions">
          <button className="chip" onClick={() => rt()?.setPaused(false)}>PLAY</button>
          <button className="chip" onClick={() => rt()?.setPaused(true)}>PAUSE</button>
          <button className="chip" onClick={() => rt()?.restart()}>RESTART</button>
          <button className="chip" onClick={() => rt()?.targetLost()}>SIM LOST</button>
          <button
            className="chip"
            onClick={() => {
              const s = storyForPage(current);
              if (s) rt()?.targetFound(s);
            }}
          >
            SIM REACQUIRE
          </button>
          <button className="chip" onClick={nextPage}>NEXT PAGE</button>
        </div>
      </div>

      <div className="hud tr">
        <button className="chip" onClick={onExit} aria-label="Exit">✕</button>
      </div>
    </div>
  );
}
