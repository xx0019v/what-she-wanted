import { useEffect, useRef, useState } from 'react';
import { ForestAR, type ARStats, type ARStatus } from '../ar/forestAR';
import type { ARPage } from '../ar/pageFX';
import { AmbientBackdrop } from './AmbientBackdrop';
import { BUILD_ID, clearCacheAndReload, isInAppBrowser, isIOS, isSafari, isSecure } from '../lib/env';
import type { Lang, Quality } from '../lib/prefs';

interface Props {
  lang: Lang;
  quality: Quality;
  reducedMotion: boolean;
  targetUrl: string;
  pages: ARPage[];
  onBack: () => void;
  onDemo: () => void;
  onEnterWorld: () => void;
}

const secure = isSecure();
const ua = navigator.userAgent;
const iOS = isIOS();
const safari = isSafari();
const inApp = isInAppBrowser();
const debugParam = new URLSearchParams(location.search).get('debug') === '1';

const initialStats: ARStats = {
  status: 'loading', fps: 0, firstFoundMs: null, reacquireCount: 0,
  targetLoaded: false, cameraActive: false, resolution: '—', device: ua, error: null,
};

/** Localised copy for each recoverable failure mode. */
function errorCopy(code: string, lang: Lang): { title: string; body: string } {
  const jp = lang === 'jp';
  switch (code) {
    case 'camera-permission-denied':
      return {
        title: jp ? 'カメラが許可されていません' : 'Camera access was denied',
        body: jp
          ? 'ブラウザでカメラを許可して再試行してください。iPhoneは アドレスバーの「ぁあ」→ Webサイトの設定 → カメラ を「許可」に。'
          : 'Allow the camera, then retry. On iPhone: the “aA” menu → Website Settings → Camera → Allow.',
      };
    case 'camera-unavailable':
      return {
        title: jp ? 'カメラが見つかりません' : 'No camera found',
        body: jp
          ? 'この端末で背面カメラを利用できませんでした。カメラなしのプレビューをご覧いただけます。'
          : 'A rear camera wasn’t available on this device. You can still explore the camera-free preview.',
      };
    case 'camera-in-use':
      return {
        title: jp ? 'カメラを使用できません' : 'The camera is busy',
        body: jp
          ? '他のアプリがカメラを使用している可能性があります。それらを閉じて再試行してください。'
          : 'Another app may be using the camera. Close it and retry.',
      };
    case 'camera-timeout':
      return {
        title: jp ? 'カメラを起動できませんでした' : 'The camera didn’t start',
        body: jp
          ? '接続が不安定か、アプリ内ブラウザの可能性があります。Safariで開き直すか、再試行してください。'
          : 'The connection may be slow, or this is an in-app browser. Reopen in Safari, or retry.',
      };
    case 'webgl-unavailable':
      return {
        title: jp ? '3D表示に対応していません' : '3D isn’t supported here',
        body: jp
          ? 'この端末/ブラウザではWebGLが使えません。カメラなしのプレビューをご覧ください。'
          : 'This browser can’t use WebGL. Please explore the camera-free preview instead.',
      };
    case 'insecure-context':
      return {
        title: jp ? '安全な接続が必要です' : 'A secure connection is required',
        body: jp
          ? 'カメラは https でのみ動作します。公開URL（https）から開いてください。'
          : 'The camera only works over https. Open the published https URL.',
      };
    default:
      return {
        title: jp ? '問題が発生しました' : 'Something went wrong',
        body: jp ? '再試行するか、カメラなしのプレビューをご覧ください。' : 'Please retry, or explore the camera-free preview.',
      };
  }
}

export function ARExperience({ lang, quality, reducedMotion, targetUrl, pages, onBack, onDemo, onEnterWorld }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<ForestAR | null>(null);
  const [stats, setStats] = useState<ARStats>(initialStats);
  const [status, setStatus] = useState<ARStatus>('loading');
  const [fatal, setFatal] = useState<string | null>(null);
  const [debug, setDebug] = useState(debugParam);
  const [stableFound, setStableFound] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to restart

  useEffect(() => {
    if (!secure) {
      setFatal('insecure-context');
      return;
    }
    let ar: ForestAR | null = null;
    let stableTimer = 0;

    (async () => {
      ar = new ForestAR({
        container: containerRef.current!,
        targetUrl,
        pages,
        quality,
        reducedMotion,
        onStatus: (s) => {
          setStatus(s);
          if (s === 'found') {
            stableTimer = window.setTimeout(() => setStableFound(true), 2200);
          } else {
            clearTimeout(stableTimer);
            if (s === 'lost') setStableFound(false);
          }
        },
        onStats: (partial) => setStats((prev) => ({ ...prev, ...partial })),
      });
      arRef.current = ar;
      const res = await ar.start();
      if (!res.ok && res.error !== 'disposed') setFatal(res.error);
    })();

    return () => {
      clearTimeout(stableTimer);
      ar?.dispose();
      arRef.current = null;
    };
  }, [targetUrl, pages, quality, reducedMotion, nonce]);

  const restart = () => {
    arRef.current?.dispose();
    setStats(initialStats);
    setStatus('loading');
    setFatal(null);
    setStableFound(false);
    setNonce((n) => n + 1);
  };

  const warming = status === 'loading' && !fatal;

  return (
    <div className="stage" role="region" aria-label="Printed-page AR">
      {/* MindAR injects its <video> + <canvas> here */}
      <div ref={containerRef} className="ar-container" />

      {/* Living night behind the camera while it warms up (or on error), so the
          screen is never a dead black rectangle. */}
      {(warming || fatal) && (
        <div className="ar-backdrop" aria-hidden="true">
          <AmbientBackdrop quality={quality} reducedMotion={reducedMotion} opacity={0.9} />
        </div>
      )}

      {/* Reticle + hint while searching */}
      {!fatal && status !== 'found' && (
        <div className="ar-reticle" aria-hidden="true">
          <div className="ar-frame" data-state={status}>
            <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
            {status === 'searching' && <span className="ar-sweep" />}
          </div>
          <p className="ar-hint">
            {status === 'loading'
              ? lang === 'jp' ? 'カメラを起動しています…' : 'Waking the camera…'
              : lang === 'jp' ? '印刷したページ全体を、ゆっくり映してください' : 'Frame the whole printed page, slowly.'}
          </p>
        </div>
      )}

      {/* Found confirmation + enter-this-world after stable tracking */}
      {!fatal && status === 'found' && (
        <div className="ar-found" aria-hidden="true">
          <span className="ar-found-mark">{lang === 'jp' ? '森が目を覚ました' : 'The forest is awake'}</span>
        </div>
      )}
      {stableFound && !fatal && (
        <div className="ar-enter">
          <button className="link glow" onClick={onEnterWorld}>
            {lang === 'jp' ? 'この世界に入る →' : 'Enter this world →'}
          </button>
        </div>
      )}

      {/* Any recoverable failure — one calm, actionable screen (never a dead hang) */}
      {fatal && (
        <div className="veil">
          <div className="center-col">
            <p className="kicker">{errorCopy(fatal, lang).title}</p>
            <p className="err">{errorCopy(fatal, lang).body}</p>
            <div className="prompt-actions">
              {fatal !== 'webgl-unavailable' && fatal !== 'insecure-context' && (
                <button className="ghost solid" onClick={restart}>{lang === 'jp' ? '再試行' : 'Retry camera'}</button>
              )}
              <button className="ghost" onClick={onDemo}>{lang === 'jp' ? 'カメラなしで見る' : 'Preview without camera'}</button>
            </div>
            <button className="link" onClick={onBack}>{lang === 'jp' ? '← 戻る' : '← Back'}</button>
          </div>
        </div>
      )}

      {/* In-app browser (LINE / Instagram / Messenger …) — camera often blocked */}
      {inApp && !fatal && (
        <div className="ar-banner" role="alert">
          {lang === 'jp'
            ? 'アプリ内ブラウザではカメラが使えないことがあります。右上メニューから「Safariで開く」を選んでください。'
            : 'In-app browsers may block the camera. Use the menu → “Open in Safari”.'}
        </div>
      )}
      {/* iOS-but-not-Safari gentle note */}
      {iOS && !safari && !inApp && !fatal && (
        <div className="ar-note">{lang === 'jp' ? 'iPhoneでは Safari で開くとカメラが安定します' : 'On iPhone, open in Safari for a reliable camera'}</div>
      )}

      {/* Minimal chrome */}
      <div className="hud tr">
        <button className="chip" onClick={() => setDebug((d) => !d)} aria-pressed={debug} aria-label="Debug">DEBUG</button>
        <button className="chip" onClick={onBack} aria-label="Back">✕</button>
      </div>
      {!fatal && (
        <div className="hud bl">
          <button className="link" onClick={restart}>{lang === 'jp' ? 'カメラ再起動' : 'Restart camera'}</button>
          <button className="link" onClick={onDemo}>{lang === 'jp' ? 'カメラなしで見る' : 'No-camera preview'}</button>
        </div>
      )}

      {/* Debug overlay */}
      {debug && (
        <div className="ar-debug" role="status" aria-live="polite">
          <div className="row"><span>STATUS</span><b data-s={status}>{fatal ? 'ERROR' : status.toUpperCase()}</b></div>
          <div className="row"><span>FPS</span><b>{stats.fps}</b></div>
          <div className="row"><span>TARGET</span><b>{stats.targetLoaded ? 'LOADED' : '—'}</b></div>
          <div className="row"><span>CAMERA</span><b>{stats.cameraActive ? 'ACTIVE' : fatal ? 'OFF' : '—'}</b></div>
          <div className="row"><span>RESOLUTION</span><b>{stats.resolution}</b></div>
          <div className="row"><span>FIRST FOUND</span><b>{stats.firstFoundMs != null ? `${Math.round(stats.firstFoundMs)} ms` : '—'}</b></div>
          <div className="row"><span>RE-ACQUIRE</span><b>{stats.reacquireCount}</b></div>
          <div className="row"><span>SECURE / HTTPS</span><b>{String(secure)}</b></div>
          <div className="row"><span>iOS / SAFARI</span><b>{String(iOS)} / {String(safari)}</b></div>
          <div className="row"><span>IN-APP BROWSER</span><b>{String(inApp)}</b></div>
          <div className="row"><span>BUILD</span><b>{BUILD_ID}</b></div>
          <div className="row small"><span>ERROR</span><b>{stats.error ?? fatal ?? 'none'}</b></div>
          <div className="row small"><span>UA</span><b className="ua">{stats.device.slice(0, 60)}…</b></div>
          <button className="chip" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={() => clearCacheAndReload()}>
            CLEAR CACHE &amp; RELOAD
          </button>
        </div>
      )}
    </div>
  );
}
