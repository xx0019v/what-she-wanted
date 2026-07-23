import type { Lang } from '../lib/prefs';

interface Props {
  lang: Lang;
  onEnter: () => void;
  onStay: () => void;
}

export function EnterPrompt({ lang, onEnter, onStay }: Props) {
  return (
    <div className="prompt-wrap" role="dialog" aria-modal="true" aria-label="Enter this world">
      <div className="center-col">
        <p className="prompt-q">
          {lang === 'jp' ? 'この世界に入りますか？' : 'Enter this world?'}
          <span className="jp">{lang === 'jp' ? 'ENTER THIS WORLD?' : 'この世界に入りますか？'}</span>
        </p>
        <div className="prompt-actions">
          <button className="ghost solid" onClick={onEnter} autoFocus>
            {lang === 'jp' ? '入る' : 'Enter'}
          </button>
          <button className="ghost" onClick={onStay}>
            {lang === 'jp' ? 'ページに留まる' : 'Stay on the page'}
          </button>
        </div>
      </div>
    </div>
  );
}
