import { useEffect, useRef, useState } from 'react';
import { ImmersiveWorld } from '../three/world';
import { WORLD_POINTS } from '../data/worldPoints';
import type { Lang, Quality } from '../lib/prefs';

interface Props {
  lang: Lang;
  quality: Quality;
  reducedMotion: boolean;
  onExit: () => void;
}

type GyroState = 'unknown' | 'active' | 'denied' | 'drag';

export function ImmersiveView({ lang, quality, reducedMotion, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<ImmersiveWorld | null>(null);
  const [caption, setCaption] = useState<{ en: string[]; jp: string[] } | null>(null);
  const [gyro, setGyro] = useState<GyroState>('unknown');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const world = new ImmersiveWorld(canvas, WORLD_POINTS, {
      quality,
      reducedMotion,
      onStoryPoint: (id) => {
        if (id == null) return setCaption(null);
        const p = WORLD_POINTS.find((w) => w.id === id);
        setCaption(p ? p.label : null);
      },
    });
    worldRef.current = world;
    world.start();
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, [quality, reducedMotion]);

  // iOS 13+ requires a user gesture to request DeviceOrientation permission.
  const requestGyro = async () => {
    const DOE = (window as any).DeviceOrientationEvent;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          worldRef.current?.enableGyro();
          setGyro('active');
        } else {
          setGyro('denied');
        }
      } else if (typeof DOE !== 'undefined') {
        // non-iOS: orientation available without explicit permission
        worldRef.current?.enableGyro();
        setGyro('active');
      } else {
        setGyro('drag');
      }
    } catch {
      setGyro('drag');
    }
    setEntered(true);
  };

  const useDrag = () => {
    setGyro('drag');
    setEntered(true);
  };

  return (
    <div className="stage" role="region" aria-label="Immersive forest">
      <canvas ref={canvasRef} className="world-canvas" />

      {/* Continuous entry: a moonlight/fog bloom fills the screen, then opens
          onto the forest — so arriving reads as passing through light, not a
          cut. It also masks the world's first frames while they warm up. */}
      {!reducedMotion && <div className="world-intro" aria-hidden="true" />}

      {/* Gyro / drag gate — the moment we can legitimately ask for motion access */}
      {!entered && (
        <div className="prompt-wrap" role="dialog" aria-modal="true" aria-label="How would you like to look around?">
          <div className="center-col">
            <p className="tagline fade-in">{lang === 'jp' ? '見渡し方を選んでください' : 'Choose how to look around'}</p>
            <div className="prompt-actions">
              <button className="ghost solid" onClick={requestGyro} autoFocus>
                {lang === 'jp' ? '端末を動かす' : 'Move device'}
              </button>
              <button className="ghost" onClick={useDrag}>
                {lang === 'jp' ? 'ドラッグで見る' : 'Drag to look'}
              </button>
            </div>
            {gyro === 'denied' && (
              <p className="note">{lang === 'jp' ? 'モーションが許可されませんでした。ドラッグでご覧いただけます。' : 'Motion was not permitted — you can still drag to look.'}</p>
            )}
          </div>
        </div>
      )}

      {entered && caption && (
        <div className="world-caption subs narration" data-lang={lang} aria-live="polite">
          {(lang === 'jp' ? caption.jp : caption.en).map((l, i) => (
            <span className="line" key={i} style={{ animationDelay: `${i * 0.12}s` }}>{l}</span>
          ))}
        </div>
      )}

      <div className="hud tr">
        <button className="chip" onClick={onExit} aria-label="Exit the world">✕ {lang === 'jp' ? '出る' : 'Exit'}</button>
      </div>
      {entered && !caption && !reducedMotion && (
        <div className="hint">{lang === 'jp' ? '見回して物語を探す' : 'Look around · find the story'}</div>
      )}
    </div>
  );
}
