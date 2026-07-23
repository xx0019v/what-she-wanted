interface Props {
  progress: number; // 0..1
  lang: 'en' | 'jp';
}

// A moon that fills as assets load — no spinner, integrated into the world.
export function Loading({ progress, lang }: Props) {
  const pct = Math.round(progress * 100);
  const fill = 40 - progress * 40; // clip the shadow as it "waxes"
  return (
    <div className="veil" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="center-col">
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <radialGradient id="mg" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#eef4fb" />
              <stop offset="100%" stopColor="#9fb6da" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="52" fill="url(#mg)" opacity="0.95" />
          <circle cx="60" cy="60" r="52" fill="#06090f" opacity="0.82" style={{ clipPath: `inset(0 0 0 ${fill}%)`, transition: 'clip-path 0.4s ease' }} />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#a9c3e6" strokeOpacity="0.25" />
        </svg>
        <p className="tagline">{lang === 'jp' ? `${pct}％  月が満ちる` : `${pct}%  the moon is waxing`}</p>
      </div>
    </div>
  );
}
