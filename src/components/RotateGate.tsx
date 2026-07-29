import { useEffect, useState } from 'react';
import type { Lang } from '../lib/prefs';

/**
 * Landscape gate.
 *
 * The work is composed for a wide frame: a printed page held in front of a
 * camera, with the world spilling past its edges. In portrait the page is
 * squeezed and the overflow is cropped, so on a phone the experience waits,
 * politely, until the device is turned.
 *
 * It is not an OS dialog and not a wall of instruction — it is the same night as
 * the book: a moon, drifting motes, and one line. It removes itself the instant
 * the phone is landscape. It never appears on a desktop or a tablet in a wide
 * window, because there is nothing to ask for there.
 */
export function RotateGate({ lang, reducedMotion }: { lang: Lang; reducedMotion: boolean }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(location.search).get('rotate') === 'force';
    const check = () => {
      if (forced) { setBlocked(true); return; }
      // Only ask a device that can actually be rotated, and only when the frame
      // is genuinely too narrow to hold the composition. `pointer: coarse` alone
      // is not enough — some mobile browsers and every desktop emulator report a
      // fine pointer — so touch capability counts too.
      const touch = window.matchMedia('(pointer: coarse)').matches
        || window.matchMedia('(hover: none)').matches
        || navigator.maxTouchPoints > 0;
      const portrait = window.innerHeight > window.innerWidth;
      const small = Math.min(window.innerWidth, window.innerHeight) < 820;
      setBlocked(touch && portrait && small);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!blocked) return null;

  return (
    <div className="rotate-gate" role="dialog" aria-modal="true" aria-live="polite">
      <div className="rotate-sky" aria-hidden="true">
        <span className="rotate-moon" />
        {!reducedMotion && Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="rotate-mote" style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 7) * 0.9}s`,
            animationDuration: `${9 + (i % 5) * 2.5}s`,
          }} />
        ))}
      </div>

      <div className="rotate-body">
        <svg className={`rotate-phone${reducedMotion ? ' still' : ''}`} viewBox="0 0 120 132" aria-hidden="true">
          <rect className="rp-frame" x="42" y="16" width="36" height="66" rx="6" />
          <line className="rp-speaker" x1="55" y1="25" x2="65" y2="25" />
          <path className="rp-arc" d="M 24 112 A 36 36 0 0 1 96 112" />
          <path className="rp-head" d="M 96 112 l -7 -6 M 96 112 l -7 6" />
        </svg>

        <p className="rotate-line">
          {lang === 'jp' ? 'スマートフォンを横向きにしてください' : 'Turn your phone sideways'}
        </p>
        <p className="rotate-sub">
          {lang === 'jp'
            ? 'この物語は、紙の外まで広がります。横向きでその世界が収まります。'
            : 'This story reaches past the edges of the page. Landscape is where it fits.'}
        </p>
      </div>
    </div>
  );
}
