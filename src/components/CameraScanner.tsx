import { useEffect, useRef, useState } from 'react';
import { SCENES } from '../data/scenes';
import { startImageTracking, targetsExist, type Tracker } from '../lib/mindar';
import type { Lang } from '../lib/prefs';

interface Props {
  lang: Lang;
  onDetect: (sceneId: number) => void;
  onCancel: () => void;
}

type Mode = 'starting' | 'ar' | 'manual' | 'denied';

// Camera-first, never a dead end:
//   1. If targets.mind exists → MindAR owns the camera and recognises pages.
//   2. Else → live camera preview + manual page selection.
//   3. Camera blocked → manual selection + photo upload.
export function CameraScanner({ lang, onDetect, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const [mode, setMode] = useState<Mode>('starting');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const has = await targetsExist();
      if (has) {
        const tracker = await startImageTracking((targetIndex) => {
          const scene = SCENES[targetIndex];
          if (scene) {
            tracker?.stop();
            onDetect(scene.id);
          }
        });
        if (cancelled) {
          tracker?.stop();
          return;
        }
        if (tracker) {
          trackerRef.current = tracker;
          setMode('ar');
          return;
        }
      }
      // Fallback: our own camera preview + manual selection.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setMode('manual');
        setShowPicker(true);
      } catch {
        setMode('denied');
        setShowPicker(true);
      }
    })();

    return () => {
      cancelled = true;
      trackerRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  const cleanup = () => {
    trackerRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };
  const pick = (id: number) => {
    cleanup();
    onDetect(id);
  };
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const m = file.name.match(/(\d{1,2})/);
    const n = m ? parseInt(m[1], 10) : NaN;
    const scene = SCENES.find((s) => s.id === n);
    pick(scene ? scene.id : 1);
  };

  const PageGrid = (
    <div className="picker" role="listbox" aria-label="Pages">
      {SCENES.map((s) => (
        <button key={s.id} onClick={() => pick(s.id)} role="option" aria-selected={false}>
          <img src={s.image} alt={`Page ${s.id}: ${s.title}`} loading="lazy" />
          <span className="n">{s.id}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="stage" role="region" aria-label="Scan a page">
      {/* our own preview only in manual mode; MindAR renders its own video */}
      {mode === 'manual' && <video ref={videoRef} className="page-img" playsInline muted aria-label="Camera preview" />}
      <div className="vignette" aria-hidden="true" />

      {mode === 'starting' && (
        <div className="world-caption subs narration" data-lang={lang}>
          <span className="line">{lang === 'jp' ? 'カメラを準備しています…' : 'Preparing the camera…'}</span>
        </div>
      )}

      {mode === 'ar' && (
        <>
          <div className="hint" style={{ opacity: 0.6, animation: 'none' }}>
            {lang === 'jp' ? '絵本のページにかざしてください' : 'Point the camera at a page'}
          </div>
          <div className="hud bl">
            <button className="link" onClick={() => setShowPicker(true)}>
              {lang === 'jp' ? '手動で選ぶ' : 'Choose manually'}
            </button>
          </div>
        </>
      )}

      {(showPicker || mode === 'denied') && (
        <div className="veil" style={{ background: mode === 'ar' ? 'rgba(6,9,15,0.86)' : 'rgba(6,9,15,0.45)' }}>
          <div className="center-col">
            <p className="tagline">
              {mode === 'denied'
                ? lang === 'jp' ? 'カメラを使用できません。ページを選択してください。' : 'Camera unavailable — choose a page.'
                : lang === 'jp' ? '持っているページを選ぶ' : 'Choose the page you are holding'}
            </p>
            {mode === 'denied' && (
              <label className="ghost" style={{ cursor: 'pointer' }}>
                {lang === 'jp' ? '写真をアップロード' : 'Upload a photo'}
                <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
              </label>
            )}
            {PageGrid}
            {mode === 'ar' && (
              <button className="link" onClick={() => setShowPicker(false)}>
                {lang === 'jp' ? '← カメラに戻る' : '← Back to camera'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hud tr">
        <button className="chip" onClick={() => { cleanup(); onCancel(); }} aria-label="Cancel scanning">
          ✕ {lang === 'jp' ? '戻る' : 'Back'}
        </button>
      </div>
    </div>
  );
}
