// Small shared preference + capability helpers. No component owns global CSS besides these.

export type Lang = 'en' | 'jp';
export type Quality = 'high' | 'low';

const KEY = 'wsw.prefs.v1';

export interface Prefs {
  lang: Lang;
  quality: Quality;
  subScale: number; // subtitle size multiplier
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Rough device-tier guess used to pick a default quality. */
export function guessLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 480;
  return cores <= 4 || mem <= 3 || smallScreen;
}

export function loadPrefs(): Prefs {
  const fallback: Prefs = {
    lang: (navigator?.language ?? 'en').toLowerCase().startsWith('ja') ? 'jp' : 'en',
    quality: guessLowPower() ? 'low' : 'high',
    subScale: 1,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable; non-fatal */
  }
  document.documentElement.style.setProperty('--sub-scale', String(p.subScale));
}
