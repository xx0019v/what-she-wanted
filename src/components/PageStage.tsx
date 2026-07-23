import { useEffect, useRef, useState } from 'react';
import { SCENES, sceneById } from '../data/scenes';
import { Atmosphere } from '../fx/atmosphere';
import { Subtitles } from './Subtitles';
import type { Lang, Quality } from '../lib/prefs';

interface Props {
  sceneId: number;
  lang: Lang;
  quality: Quality;
  reducedMotion: boolean;
  onChangeScene: (id: number) => void;
  onEnterWorld: () => void;
}

export function PageStage({ sceneId, lang, quality, reducedMotion, onChangeScene, onEnterWorld }: Props) {
  const scene = sceneById(sceneId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const atmoRef = useRef<Atmosphere | null>(null);
  const tilt = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [promptReady, setPromptReady] = useState(false);

  // create atmosphere once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const atmo = new Atmosphere(canvas, { quality, reducedMotion });
    atmoRef.current = atmo;
    atmo.start();
    const onResize = () => atmo.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      atmo.dispose();
      atmoRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, reducedMotion]);

  // update scene fx
  useEffect(() => {
    atmoRef.current?.setScene(scene.motion.fx, scene.motion.focus);
    setPromptReady(false);
    const t = window.setTimeout(() => setPromptReady(true), reducedMotion ? 200 : 3600);
    return () => clearTimeout(t);
  }, [sceneId, scene.motion.fx, scene.motion.focus, reducedMotion]);

  // parallax input (pointer + device tilt), applied to both image and fx
  useEffect(() => {
    if (reducedMotion) return;
    const onPointer = (e: PointerEvent) => {
      tilt.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      tilt.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt.current.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      tilt.current.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onTilt);

    let raf = 0;
    const strength = scene.motion.parallax;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = tilt.current;
      c.x += (c.tx - c.x) * 0.06;
      c.y += (c.ty - c.y) * 0.06;
      const img = imgRef.current;
      if (img) {
        const px = -c.x * 18 * strength;
        const py = -c.y * 12 * strength;
        const s = 1.06 + strength * 0.04;
        img.style.transform = `scale(${s}) translate(${px}px, ${py}px)`;
      }
      atmoRef.current?.setTilt(c.x, c.y);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [sceneId, scene.motion.parallax, reducedMotion]);

  const idx = SCENES.findIndex((s) => s.id === sceneId);
  const go = (d: number) => {
    const next = SCENES[(idx + d + SCENES.length) % SCENES.length];
    onChangeScene(next.id);
  };

  return (
    <div
      className="stage"
      role="group"
      aria-label={`Page ${scene.id}: ${scene.title}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
      tabIndex={0}
    >
      <img
        ref={imgRef}
        className="page-img"
        src={scene.image}
        alt={`${scene.title} — printed page`}
        draggable={false}
        style={{ transform: 'scale(1.06)' }}
      />
      <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      {/* The printed page already carries its English words; the camera must
          not cover them. So on the page we add only the Japanese translation
          the page lacks. (The 360° world captions both languages.) */}
      {lang === 'jp' && (
        <Subtitles
          en={scene.en}
          jp={scene.jp}
          lang={lang}
          style={scene.style}
          anchor={scene.anchor}
          cueKey={sceneId}
          reducedMotion={reducedMotion}
        />
      )}

      {/* page navigation */}
      <div className="dots" role="tablist" aria-label="Pages">
        {SCENES.map((s) => (
          <button
            key={s.id}
            className="dot"
            role="tab"
            aria-current={s.id === sceneId}
            aria-label={`Page ${s.id}: ${s.title}`}
            onClick={() => onChangeScene(s.id)}
          />
        ))}
      </div>

      <div className="hud bl">
        <button className="chip" onClick={() => go(-1)} aria-label="Previous page">‹ Prev</button>
        <button className="chip" onClick={() => go(1)} aria-label="Next page">Next ›</button>
      </div>

      {/* Enter-this-world invitation (appears once the page has breathed) */}
      {promptReady && (
        <div className="hud br">
          <button className="link" onClick={onEnterWorld} aria-label="Enter this world">
            {lang === 'jp' ? 'この世界に入る →' : 'Enter this world →'}
          </button>
        </div>
      )}
      {!reducedMotion && <div className="hint">{lang === 'jp' ? '動かして見つめて' : 'Move · Gaze'}</div>}
    </div>
  );
}
