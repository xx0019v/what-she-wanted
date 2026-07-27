import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Loading } from './components/Loading';
import { PageStage } from './components/PageStage';
import { AmbientBackdrop } from './components/AmbientBackdrop';
import { SCENES } from './data/scenes';
import { loadPrefs, savePrefs, prefersReducedMotion, type Lang, type Quality } from './lib/prefs';
import { BUILD_ID, isInAppBrowser } from './lib/env';
import type { ARPage } from './ar/pageFX';

const inApp = isInAppBrowser();

// Three.js / MindAR live in lazy chunks, off the initial load.
const ARExperience = lazy(() => import('./components/ARExperience').then((m) => ({ default: m.ARExperience })));
const ImmersiveView = lazy(() => import('./components/ImmersiveView').then((m) => ({ default: m.ImmersiveView })));
const ARPreview = lazy(() => import('./components/ARPreview').then((m) => ({ default: m.ARPreview })));

type Phase = 'loading' | 'start' | 'ar' | 'demo' | 'world' | 'arfx';

// Printed-page AR. The compiled target file carries these pages in this exact
// index order (see scripts/compile-targets.mjs); each shows its own FX.
const AR_SCENE = 4;
const AR_PAGES: ARPage[] = [4, 5, 11, 17];
const TARGET_URL = `${import.meta.env.BASE_URL}targets/pages.mind`;

// QA / preview deep-link: ?view=world|demo|ar jumps straight to a phase so the
// 360° world and page layers can be reviewed without re-clicking the flow.
const VIEW_PARAM = new URLSearchParams(location.search).get('view');
const DEEP_LINK: Phase | null =
  VIEW_PARAM === 'world' || VIEW_PARAM === 'demo' || VIEW_PARAM === 'ar' || VIEW_PARAM === 'arfx'
    ? VIEW_PARAM
    : null;
const PAGE_PARAM = Number(new URLSearchParams(location.search).get('page'));
const FX_PAGE: ARPage = PAGE_PARAM === 5 || PAGE_PARAM === 11 || PAGE_PARAM === 17 ? PAGE_PARAM : 4;

export function App() {
  const [phase, setPhase] = useState<Phase>(DEEP_LINK ?? 'loading');
  const [progress, setProgress] = useState(0);
  const initial = useMemo(() => loadPrefs(), []);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [quality] = useState<Quality>(initial.quality);
  const reduced = useRef(prefersReducedMotion()).current;

  useEffect(() => {
    savePrefs({ lang, quality, subScale: initial.subScale });
  }, [lang, quality, initial.subScale]);

  // Light preload: cover + the AR page.
  useEffect(() => {
    const ids = [1, AR_SCENE];
    let n = 0;
    ids.forEach((id) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        n += 1;
        setProgress(n / ids.length);
      };
      img.src = SCENES.find((s) => s.id === id)!.image;
    });
    const t = setTimeout(() => setPhase((p) => (p === 'loading' ? 'start' : p)), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {phase === 'loading' && <Loading progress={progress} lang={lang} />}

      {phase === 'start' && (
        <div className="veil landing">
          <AmbientBackdrop quality={quality} reducedMotion={reduced} />
          <div className="landing-vignette" aria-hidden="true" />
          {inApp && (
            <div className="ar-banner" role="alert">
              {lang === 'jp'
                ? 'アプリ内ブラウザではカメラが使えないことがあります。メニューから「Safariで開く」を選んでください。'
                : 'In-app browsers may block the camera. Use the menu → “Open in Safari”.'}
            </div>
          )}
          <div className="center-col landing-col">
            <p className="kicker fade-in">ISCA 2026 · Digital Content</p>
            <h1 className="title fade-in d1">WHAT SHE WANTED</h1>
            <span className="rule fade-in d1" aria-hidden="true" />
            <p className="lede fade-in d2">
              {lang === 'jp' ? '印刷したページにかざすと、絵本が目を覚ます。' : 'Hold your phone to the printed page, and the story wakes.'}
            </p>
            <div className="prompt-actions fade-in d2">
              <button className="ghost solid" onClick={() => setPhase('ar')}>
                {lang === 'jp' ? 'ARを始める' : 'Begin AR'}
              </button>
              <button className="ghost" onClick={() => setPhase('demo')}>
                {lang === 'jp' ? 'カメラなしで見る' : 'Preview without camera'}
              </button>
            </div>
            <div className="lang fade-in d3" role="group" aria-label="Language">
              <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
              <span className="sep">·</span>
              <button className="chip" aria-pressed={lang === 'jp'} onClick={() => setLang('jp')}>JP</button>
            </div>
            <p className="note fade-in d3">
              {lang === 'jp'
                ? '紙のページ（page 4・月夜の森）をご用意ください。「ARを始める」→ カメラを許可 → ページ全体を映す。無音設計。'
                : 'Have page 4 (the moonlit forest) printed. Begin AR → allow the camera → frame the whole page. Silent by design.'}
            </p>
          </div>
          <div className="build-tag">BUILD {BUILD_ID}</div>
        </div>
      )}

      {phase === 'ar' && (
        <Suspense fallback={<Loading progress={0.9} lang={lang} />}>
          <ARExperience
            lang={lang}
            quality={quality}
            reducedMotion={reduced}
            targetUrl={TARGET_URL}
            pages={AR_PAGES}
            onBack={() => setPhase('start')}
            onDemo={() => setPhase('demo')}
            onEnterWorld={() => setPhase('world')}
          />
        </Suspense>
      )}

      {phase === 'demo' && (
        <PageStage
          sceneId={AR_SCENE}
          lang={lang}
          quality={quality}
          reducedMotion={reduced}
          onChangeScene={() => undefined}
          onEnterWorld={() => setPhase('world')}
        />
      )}

      {phase === 'world' && (
        <Suspense fallback={<Loading progress={0.95} lang={lang} />}>
          <ImmersiveView lang={lang} quality={quality} reducedMotion={reduced} onExit={() => setPhase('ar')} />
        </Suspense>
      )}

      {phase === 'arfx' && (
        <Suspense fallback={<Loading progress={0.92} lang={lang} />}>
          <ARPreview
            lang={lang}
            quality={quality}
            reducedMotion={reduced}
            page={FX_PAGE}
            onExit={() => setPhase('start')}
            onEnterWorld={() => setPhase('world')}
          />
        </Suspense>
      )}

      {(phase === 'start' || phase === 'demo') && (
        <div className="hud tr" style={{ zIndex: 90 }}>
          <div className="lang" role="group" aria-label="Language">
            <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
            <span className="sep">·</span>
            <button className="chip" aria-pressed={lang === 'jp'} onClick={() => setLang('jp')}>JP</button>
          </div>
          {phase === 'demo' && (
            <button className="chip" onClick={() => setPhase('start')} aria-label="Back">✕</button>
          )}
        </div>
      )}
    </>
  );
}
