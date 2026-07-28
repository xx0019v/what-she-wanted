import { useEffect, useState } from 'react';
import type { SubtitleCue } from '../story/storyTypes';
import type { Lang } from '../lib/prefs';

interface Props {
  cue: SubtitleCue | null;
  lang: Lang;
  reducedMotion: boolean;
}

/**
 * A story line that lives in the air over the paper — never a card. It fades in
 * on its cue, holds, and leaves. Position comes from the cue so it sits in the
 * page's negative space instead of over the printed art.
 */
export function StorySubtitle({ cue, lang, reducedMotion }: Props) {
  const [shown, setShown] = useState<SubtitleCue | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (cue) {
      setShown(cue);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    // let it fade before unmounting
    setLeaving(true);
    const t = window.setTimeout(() => setShown(null), reducedMotion ? 0 : 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue]);

  if (!shown) return null;
  const text = lang === 'jp' ? shown.jp : shown.en;

  return (
    <div
      className={`story-line ${shown.anchor}${leaving ? ' leaving' : ''}`}
      data-lang={lang}
      aria-live="polite"
      role="note"
    >
      <span>{text}</span>
    </div>
  );
}
