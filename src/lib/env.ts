// Runtime environment helpers for public deployment.

export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

export const isHttps = () => location.protocol === 'https:';
export const isLocalhost = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const isSecure = () => window.isSecureContext || isHttps() || isLocalhost();

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isSafari = () =>
  /^((?!chrome|crios|fxios|android|edgios|edg).)*safari/i.test(navigator.userAgent);

// LINE, Instagram, Facebook/Messenger, Twitter/X, TikTok, KakaoTalk, etc.
// These in-app webviews often block or mishandle getUserMedia on iOS.
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /\bLine\b|Instagram|FBAN|FBAV|FB_IAB|Messenger|Twitter|TikTok|KAKAOTALK|MicroMessenger|WhatsApp|Snapchat/i.test(ua);
}

export async function clearCacheAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  }
  // cache-bust the document too
  location.replace(location.pathname + '?v=' + Date.now());
}
