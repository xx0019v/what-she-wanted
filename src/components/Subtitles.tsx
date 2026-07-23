import { useEffect, useState } from 'react';
import type { Lang } from '../lib/prefs';
import type { SubtitleStyle } from '../data/scenes';

interface Props {
  en: string[];
  jp: string[];
  lang: Lang;
  style: SubtitleStyle;
  anchor: string;
  /** re-key to restart the reveal animation */
  cueKey: string | number;
  reducedMotion: boolean;
}

export function Subtitles({ en, jp, lang, style, anchor, cueKey, reducedMotion }: Props) {
  const lines = lang === 'jp' ? jp : en;
  const [shown, setShown] = useState(reducedMotion ? lines.length : 0);

  useEffect(() => {
    if (reducedMotion) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    let i = 0;
    const timers: number[] = [];
    const step = () => {
      i += 1;
      setShown(i);
      if (i < lines.length) timers.push(window.setTimeout(step, 1400));
    };
    timers.push(window.setTimeout(step, 500));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueKey, lang]);

  return (
    <div className={`subs ${style} ${anchor}`} data-lang={lang} aria-live="polite" role="note">
      {lines.slice(0, shown).map((l, idx) => (
        <span className="line" key={idx} style={{ animationDelay: `${idx * 0.05}s` }}>
          {l}
        </span>
      ))}
    </div>
  );
}
