// ────────────────────────────────────────────────────────────────
// MindAR image-tracking wrapper (loaded from CDN at runtime, not bundled).
// When a compiled target file exists at `${BASE_URL}targets/targets.mind`
// MindAR owns the camera and emits target-found events. Otherwise we return
// null and the caller falls back to manual page selection — never a dead end.
// See docs/CAMERA_TEST_TODAY.md for compiling targets.mind (60s web tool).
// ────────────────────────────────────────────────────────────────

export interface Tracker {
  stop: () => void;
  container: HTMLElement;
}

const CDN = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';

export function targetUrl() {
  return `${import.meta.env.BASE_URL}targets/targets.mind`;
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).MINDAR?.IMAGE?.MindARThree) return resolve(true);
    if (document.querySelector('script[data-mindar]')) {
      const existing = document.querySelector('script[data-mindar]') as HTMLScriptElement;
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.mindar = 'true';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export async function targetsExist(): Promise<boolean> {
  try {
    const res = await fetch(targetUrl(), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Start MindAR image tracking. MindAR opens and renders the camera itself into
 * a full-screen container placed behind the React UI. Returns null if MindAR
 * or the target file is unavailable (caller shows manual selection).
 */
export async function startImageTracking(
  onFound: (targetIndex: number) => void,
  onLost?: (targetIndex: number) => void,
): Promise<Tracker | null> {
  const [ok, has] = await Promise.all([loadScript(CDN), targetsExist()]);
  const MindAR = (window as any).MINDAR;
  if (!ok || !has || !MindAR?.IMAGE?.MindARThree) return null;

  try {
    const container = document.createElement('div');
    container.id = 'mindar-container';
    container.style.cssText = 'position:fixed;inset:0;z-index:5;overflow:hidden;';
    document.body.appendChild(container);

    const mindar = new MindAR.IMAGE.MindARThree({
      container,
      imageTargetSrc: targetUrl(),
      uiScanning: false,
      uiLoading: false,
      uiError: false,
      maxTrack: 1,
      filterMinCF: 0.0001,
      filterBeta: 0.01,
    });
    const { renderer, scene, camera } = mindar;
    for (let i = 0; i < 17; i++) {
      const anchor = mindar.addAnchor(i);
      anchor.onTargetFound = () => onFound(i);
      if (onLost) anchor.onTargetLost = () => onLost(i);
    }
    await mindar.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));

    return {
      container,
      stop: () => {
        try {
          renderer.setAnimationLoop(null);
          mindar.stop();
        } catch {
          /* already stopped */
        }
        container.remove();
      },
    };
  } catch {
    return null;
  }
}
