import { useEffect, useRef } from 'react';
import { Atmosphere } from '../fx/atmosphere';
import type { Quality } from '../lib/prefs';

interface Props {
  quality: Quality;
  reducedMotion: boolean;
  /** 0..1 — lets callers dim the backdrop behind a live camera feed. */
  opacity?: number;
}

// A calm, living night behind the UI: a low moon, drifting fog, a few
// fireflies and a faint starfield — the same procedural engine the story
// uses, so the very first screen already belongs to the forest.
export function AmbientBackdrop({ quality, reducedMotion, opacity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const atmo = new Atmosphere(canvas, { quality, reducedMotion });
    atmo.setScene(['moonPulse', 'fog', 'fireflies'], [0.5, 0.28]);
    atmo.start();
    const onResize = () => atmo.resize();
    window.addEventListener('resize', onResize);

    let raf = 0;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      tilt.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      tilt.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      tilt.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    if (!reducedMotion) {
      window.addEventListener('pointermove', onPointer);
      window.addEventListener('deviceorientation', onTilt);
      const loop = () => {
        raf = requestAnimationFrame(loop);
        tilt.x += (tilt.tx - tilt.x) * 0.05;
        tilt.y += (tilt.ty - tilt.y) * 0.05;
        atmo.setTilt(tilt.x, tilt.y);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      atmo.dispose();
    };
  }, [quality, reducedMotion]);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" style={{ opacity }} />;
}
