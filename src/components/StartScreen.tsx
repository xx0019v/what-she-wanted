import type { Lang } from '../lib/prefs';

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  onScan: () => void;
  onRead: () => void;
}

// Quiet film-title opening. Two ways in: scan a real page, or read on-screen.
export function StartScreen({ lang, onLang, onScan, onRead }: Props) {
  return (
    <div className="veil">
      <div className="center-col">
        <p className="tagline fade-in">ISCA 2026 · Digital Content</p>
        <h1 className="title fade-in d1">WHAT SHE WANTED</h1>
        <p className="tagline fade-in d1">
          {lang === 'jp' ? '紙のページの、その先の物語' : 'A story beyond the printed page'}
        </p>

        <div className="prompt-actions fade-in d2">
          <button className="ghost solid" onClick={onScan}>
            {lang === 'jp' ? 'ページをかざす' : 'Scan the page'}
          </button>
          <button className="ghost" onClick={onRead}>
            {lang === 'jp' ? '画面で読む' : 'Read on screen'}
          </button>
        </div>

        <div className="lang fade-in d3" role="group" aria-label="Language">
          <button className="chip" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          <span className="sep">·</span>
          <button className="chip" aria-pressed={lang === 'jp'} onClick={() => onLang('jp')}>JP</button>
        </div>

        <p className="note fade-in d3">
          {lang === 'jp'
            ? '本作は無音の設計です。感情は光・動き・余白・言葉で描かれます。'
            : 'This piece is silent by design. Emotion is carried by light, motion, space, and words.'}
        </p>
      </div>
    </div>
  );
}
