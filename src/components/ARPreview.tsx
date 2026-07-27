import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PAGE_ASPECT } from '../ar/anchorFX';
import { buildPageFX, AR_PAGE_IMAGE, type ARPage, type AnchorFX } from '../ar/pageFX';
import type { Lang, Quality } from '../lib/prefs';

interface Props {
  lang: Lang;
  quality: Quality;
  reducedMotion: boolean;
  page: ARPage;
  onExit: () => void;
  onEnterWorld: () => void;
}

// A camera-free preview of the printed-page AR: the page lies on a surface and
// the anchor FX rise off it. Slowly orbits so the depth (moon floating forward,
// branches overhanging, fog crossing the edge) is legible without a phone.
export function ARPreview({ lang, quality, reducedMotion, page, onExit, onEnterWorld }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.3 : 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.01, 50);

    // the surface the page rests on (so overflow fog / branch / shadow read)
    const surfaceMat = new THREE.MeshBasicMaterial({ color: 0x0c1020 });
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), surfaceMat);
    surface.position.z = -0.01;
    scene.add(surface);

    // the printed page
    const loader = new THREE.TextureLoader();
    const pageTex = loader.load(`${import.meta.env.BASE_URL}pages/${AR_PAGE_IMAGE[page]}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
    const pageMat = new THREE.MeshBasicMaterial({ map: pageTex });
    const pagePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, PAGE_ASPECT), pageMat);
    scene.add(pagePlane);
    // a thin luminous edge so the paper's rectangle is legible as it tilts
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, PAGE_ASPECT)),
      new THREE.LineBasicMaterial({ color: 0x2a3550, transparent: true, opacity: 0.5 }),
    );
    edge.position.z = 0.001;
    scene.add(edge);

    const group = new THREE.Group();
    scene.add(group);
    const fx: AnchorFX = buildPageFX(page, group, { quality });

    // camera orbit
    const dist = 1.7;
    let yaw = 0.5, pitch = 0.32;
    let targetYaw = 0.5, targetPitch = 0.32;
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
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (!dragging && !reducedMotion) targetYaw = 0.5 + Math.sin(t * 0.12) * 0.32; // gentle sway to reveal parallax
      yaw += (targetYaw - yaw) * 0.06;
      pitch += (targetPitch - pitch) * 0.06;
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, 0.02, 0.05);
      if (!reducedMotion) fx.update(t, dt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      fx.dispose();
      pageTex.dispose();
      pageMat.dispose();
      surfaceMat.dispose();
      (edge.geometry as THREE.BufferGeometry).dispose();
      (edge.material as THREE.Material).dispose();
      pagePlane.geometry.dispose();
      surface.geometry.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [quality, reducedMotion, page]);

  return (
    <div className="stage" role="region" aria-label="Spatial preview">
      <canvas ref={canvasRef} className="world-canvas" />
      <div className="ar-note" style={{ bottom: 'auto', top: 'max(3vh, env(safe-area-inset-top))' }}>
        {lang === 'jp' ? '立体プレビュー（カメラなし）· ドラッグで見る' : 'Spatial preview (no camera) · drag to look'}
      </div>
      <div className="ar-enter">
        <button className="link glow" onClick={onEnterWorld}>
          {lang === 'jp' ? 'この世界に入る →' : 'Enter this world →'}
        </button>
      </div>
      <div className="hud tr">
        <button className="chip" onClick={onExit} aria-label="Back">✕</button>
      </div>
    </div>
  );
}
