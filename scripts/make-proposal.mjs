// ────────────────────────────────────────────────────────────────
// Build the ISCA 2026 proposal (企画書) — a 5-page A4 PDF, dark & editorial,
// illustrated with live captures of the actual work. Also renders a
// 160×90mm / 350dpi thumbnail.
//   node scripts/make-proposal.mjs
// ────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const LIVE = 'https://xx0019v.github.io/what-she-wanted';
const OUT = resolve(ROOT, 'submit');
const WORK = resolve(OUT, 'assets');
mkdirSync(WORK, { recursive: true });

const AUTHOR = process.env.WSW_AUTHOR || '＿＿＿＿＿＿（お名前）';
const SCHOOL = process.env.WSW_SCHOOL || '＿＿＿＿＿＿（学校名）';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const shot = async (name, url, prep) => {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.addStyleTag({ content: '.ar-note,.ar-enter,.hud,.hint,.dots{display:none!important}' }).catch(() => {});
      if (prep) await prep(page);
      await sleep(3200);
      await page.screenshot({ path: resolve(WORK, name + '.jpg'), type: 'jpeg', quality: 86 });
      console.log('captured', name);
    } catch (e) {
      console.log('capture failed', name, String(e).split('\n')[0]);
    }
  };

  await shot('concept', `${LIVE}/?view=arfx&page=4`);
  await shot('p11', `${LIVE}/?view=arfx&page=11`);
  await shot('p5', `${LIVE}/?view=arfx&page=5`);
  await shot('p17', `${LIVE}/?view=arfx&page=17`);
  await shot('demo', `${LIVE}/?view=demo`);
  await shot('world', `${LIVE}/?view=world`, async (p) => {
    try { await p.getByRole('button', { name: 'ドラッグで見る' }).click({ timeout: 6000 }); } catch { /* no gate */ }
    await sleep(1200);
    await p.mouse.move(900, 480); await p.mouse.down(); await p.mouse.move(560, 520, { steps: 12 }); await p.mouse.up();
  });

  // supporting assets
  for (const n of [1, 4, 5, 11, 17]) {
    const src = resolve(ROOT, 'public', 'pages', `${n}.jpg`);
    if (existsSync(src)) copyFileSync(src, resolve(WORK, `page${n}.jpg`));
  }
  if (existsSync(resolve(ROOT, 'public', 'print', 'qr.png'))) copyFileSync(resolve(ROOT, 'public', 'print', 'qr.png'), resolve(WORK, 'qr.png'));

  // ── proposal HTML ────────────────────────────────────────────────
  const html = buildHtml();
  const htmlPath = resolve(WORK, 'proposal.html');
  writeFileSync(htmlPath, html);

  const pdfPage = await ctx.newPage();
  await pdfPage.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await sleep(400);
  const pdfPath = resolve(OUT, 'WHAT_SHE_WANTED_企画書.pdf');
  await pdfPage.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log('PDF →', pdfPath);

  // tall preview PNG for verification
  await pdfPage.setViewportSize({ width: 794, height: 1123 });
  await pdfPage.screenshot({ path: resolve(WORK, 'proposal_preview.png'), fullPage: true });

  // ── thumbnail 160×90mm @350dpi = 2205×1240 ──────────────────────
  const thumb = await ctx.newPage();
  await thumb.setViewportSize({ width: 2205, height: 1240 });
  await thumb.goto(`${LIVE}/?view=arfx&page=4`, { waitUntil: 'load' });
  await thumb.addStyleTag({ content: '.ar-note,.ar-enter,.hud{display:none!important}' }).catch(() => {});
  await sleep(3500);
  await thumb.screenshot({ path: resolve(OUT, 'WHAT_SHE_WANTED_thumbnail.jpg'), type: 'jpeg', quality: 92 });
  console.log('thumbnail →', resolve(OUT, 'WHAT_SHE_WANTED_thumbnail.jpg'));

  await browser.close();
}

function fig(name, cap) {
  return `<figure><div class="ph" style="background-image:url('${name}.jpg')"></div>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
}

function buildHtml() {
  const URL = 'https://xx0019v.github.io/what-she-wanted/';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  :root{
    --bg:#070a12; --bg2:#0b0f1c; --ink:#e9eff9; --mute:#9fb4d4; --line:rgba(150,175,214,.22);
    --violet:#b28ce4; --moon:#cfe0f6;
    --serif:"Hiragino Mincho ProN","Times New Roman",Georgia,serif;
    --sans:"Hiragino Kaku Gothic ProN","Helvetica Neue",Arial,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  html,body{background:var(--bg);color:var(--ink);font-family:var(--sans);}
  .page{position:relative;width:210mm;height:297mm;overflow:hidden;background:
    radial-gradient(120% 80% at 50% 0%, #12182b 0%, var(--bg) 58%, #05070d 100%);
    padding:18mm 16mm;display:flex;flex-direction:column;}
  .page + .page{page-break-before:always;}
  .kick{font-family:var(--sans);font-size:8.5pt;letter-spacing:.32em;text-transform:uppercase;color:var(--mute);}
  h1{font-family:var(--serif);font-weight:500;letter-spacing:.06em;color:#fff;}
  h2{font-family:var(--serif);font-weight:500;font-size:19pt;letter-spacing:.02em;margin-bottom:2mm;}
  h2 .en{display:block;font-family:var(--sans);font-size:8.5pt;letter-spacing:.28em;text-transform:uppercase;color:var(--mute);margin-top:1.5mm;}
  p{font-size:9.4pt;line-height:1.72;color:#dbe6f6;}
  .mute{color:var(--mute);} .small{font-size:8.4pt;line-height:1.65;}
  .rule{height:1px;background:var(--line);margin:5mm 0;}
  figure{margin:0;} .ph{background-size:cover;background-position:center;border-radius:2mm;border:1px solid var(--line);}
  figcaption{font-size:7.6pt;letter-spacing:.04em;color:var(--mute);margin-top:1.5mm;}
  .flex{display:flex;gap:6mm;} .col{flex:1;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:5mm;}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;}
  .badge{display:flex;align-items:center;gap:3mm;}
  .badge img{width:16mm;height:16mm;border-radius:1.5mm;background:#fff;}
  .tag{display:inline-block;font-family:var(--sans);font-size:7.6pt;letter-spacing:.14em;color:var(--moon);
    border:1px solid var(--line);border-radius:20px;padding:1mm 3mm;margin:0 1.5mm 1.5mm 0;}
  .num{display:flex;gap:4mm;margin:3mm 0;}
  .num b{font-family:var(--serif);font-size:13pt;color:var(--violet);min-width:8mm;}
  .stage{display:flex;flex-direction:column;gap:1mm;}
  .stage h3{font-family:var(--serif);font-size:12pt;font-weight:500;}
  .stage .en{font-size:7.4pt;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);}
  </style></head><body>

  <!-- PAGE 1 — COVER -->
  <section class="page">
    <div class="kick">ISCA 2026 ・ デジタルコンテンツ部門 &nbsp;/&nbsp; DIGITAL CONTENT</div>
    <div style="margin-top:10mm">
      <h1 style="font-size:40pt;line-height:1.02">WHAT SHE WANTED</h1>
      <div style="font-family:var(--serif);font-size:15pt;color:var(--moon);margin-top:4mm">現実に、絵本の世界がやってくる。</div>
      <p class="mute" style="margin-top:2mm;max-width:150mm">A printed picture-book whose world arrives into your room — seen through the camera. 印刷した紙の絵本にスマホをかざすと、月・森・霧・光が紙面から立ち上がり、現実の空間へ静かにあふれ出す。そしてその奥の世界へ、入ることができる。</p>
    </div>
    <div style="margin-top:8mm">${fig('concept', 'カメラ越し：紙の絵本（page 4）から3Dの森と月が立ち上がり、紙の縁を越えて現実空間へせり出す')}</div>
    <div class="ph" style="display:none"></div>
    <style>section:nth-of-type(1) .ph{height:118mm}</style>
    <div class="foot">
      <div>
        <div class="small mute">作：${AUTHOR}　／　${SCHOOL}</div>
        <div class="small mute">形式：Web AR（画像認識）＋ 360°没入空間 ・ 無音設計 ・ EN/JP</div>
        <div class="small" style="color:var(--moon);margin-top:1.5mm">${URL}</div>
      </div>
      <div class="badge"><img src="qr.png" alt="QR"><div class="small mute">スマホで<br>体験できます</div></div>
    </div>
  </section>

  <!-- PAGE 2 — CONCEPT -->
  <section class="page">
    <h2>紙とデジタルが、共作する物語<span class="en">The paper and the camera tell it together</span></h2>
    <p>紙の絵本は「出来事」を描く。カメラ越しに立ち上がるARは「その世界が本当に在ること」を見せ、最後にその世界へ「入る」。<b>現実・記憶・物語が三層で重なり、現実とデジタルが協働して物語を完成させる</b>——それがこの作品です。</p>
    <div class="rule"></div>
    <div class="flex">
      <div class="col stage"><div class="en">Layer 1 — Reality</div><h3>紙の絵本</h3><p class="small">原画・文章・出来事。物語の土台であり主役。印刷された現実。</p></div>
      <div class="col stage"><div class="en">Layer 2 — Memory</div><h3>カメラ越しのAR</h3><p class="small">紙面から月・木・霧・光・記憶が立ち上がり、<b>紙の縁を越えて現実の部屋へせり出す</b>。彼女の中に残っていたもの。</p></div>
      <div class="col stage"><div class="en">Layer 3 — The world</div><h3>360°の世界</h3><p class="small">ページの向こうに実在していた森へ入る。月・霧・少女と魔女の気配。</p></div>
    </div>
    <div class="rule"></div>
    <div class="grid2" style="align-items:start">
      <div>
        <h2 style="font-size:14pt">物語 — 循環する寓話<span class="en">A cyclical fable</span></h2>
        <p class="small">悪夢に苦しむ少女が、森の魔女に「悪い記憶をすべて消して」と願う。大人になり悪夢は消えたのに心は空虚。再び現れた魔女は告げる——「記憶を消すな、<b>乗り越えろ</b>。できなければ、子どものまま成長できない」。少女は解放される。だが誰も気づかない、<b>かつて苦しんだ少女こそが、次の願いを叶える魔女になっていた</b>ことに。月（青→紫→青）が全編を貫く。</p>
        <p class="small mute" style="margin-top:2mm"><b>なぜARなのか：</b>紙は出来事を、カメラは"内面と記憶"を映す。p17の反転があるからこそ、"ページの裏に世界が在った"というAR構造が装飾ではなく物語の必然になる。</p>
      </div>
      <div>${fig('demo', 'PAGE ALIVE：紙面の上に手続き生成の霧・ホタル・月光と字幕が重なる')}<style>section:nth-of-type(2) figure .ph{height:66mm}</style></div>
    </div>
    <div class="foot"><div class="small mute">WHAT SHE WANTED ・ 作品概要</div><div class="small mute">02 / 05</div></div>
  </section>

  <!-- PAGE 3 — HOW IT WORKS -->
  <section class="page">
    <h2>体験の流れ・操作<span class="en">How it works</span></h2>
    <p class="small mute">無音で成立する設計。音声なしでも、動き・光・空気・字幕で物語が伝わる。</p>
    <div class="rule"></div>
    <div class="flex">
      <div class="col">
        <div class="num"><b>1</b><p class="small">印刷した絵本のページ（p4/5/11/17）を用意する。</p></div>
        <div class="num"><b>2</b><p class="small">スマホ／タブレットの <b>Safari で作品URL</b> を開き「ARを始める」。</p></div>
        <div class="num"><b>3</b><p class="small">カメラでページ全体を映す → 認識。</p></div>
        <div class="num"><b>4</b><p class="small">紙面から <b>3Dの月・木・霧・ホタル</b> が立ち上がり、<b>紙の縁を越えて現実空間へ</b>。傾けると立体的に視差が動く。</p></div>
        <div class="num"><b>5</b><p class="small">ページごとに<b>固有の演出</b>（右：p11 月が紫へ／p5 契約の空間）。</p></div>
        <div class="num"><b>6</b><p class="small">「この世界に入る」→ 光と霧を抜けて <b>360°世界</b> へ連続的に移行。見回し（ジャイロ／ドラッグ）で物語点が浮かぶ。</p></div>
      </div>
      <div class="col" style="display:flex;flex-direction:column;gap:4mm">
        ${fig('p11', 'p11：月が青から紫へ、記憶が滲むように')}
        ${fig('p5', 'p5：少女（青）と魔女（紫）の間に集う契約の記憶')}
        <style>section:nth-of-type(3) figure .ph{height:52mm}</style>
      </div>
    </div>
    <div class="rule"></div>
    <p class="small"><span class="tag">EN / JP 字幕</span><span class="tag">無音設計</span><span class="tag">印刷キット・QR同梱</span><span class="tag">?debug=1 で診断</span><span class="tag">カメラなしプレビュー</span></p>
    <div class="foot"><div class="small mute">WHAT SHE WANTED ・ 操作説明</div><div class="small mute">03 / 05</div></div>
  </section>

  <!-- PAGE 4 — PER-PAGE STAGING & WORLD -->
  <section class="page">
    <h2>ページ別の空間演出 と 世界<span class="en">Per-page staging & the world</span></h2>
    <p class="small">同じ演出は使い回さない。各ページが、その物語の瞬間に固有の空間になる。<b>原画は主役のまま</b>、3Dは"原画の中に在った空気"を可視化する。人物は2.5Dシルエットで絵本のデザインを保つ（安価な3Dモデルにしない）。</p>
    <div class="grid2" style="margin-top:4mm">
      <div class="stage"><div class="en">p4 — the forest leaves the page</div><h3>森</h3><p class="small">月が浮き、枝が手前にせり出し、霧とホタルが紙面外へ流れる。</p></div>
      <div class="stage"><div class="en">p5 — the promise between them</div><h3>契約の空間</h3><p class="small">少女＝青、魔女＝紫の記憶が中央で混ざり切らずに集う。</p></div>
      <div class="stage"><div class="en">p11 — the moon remembers</div><h3>紫の月</h3><p class="small">青い月が数秒かけて紫へ、そして静止。全作品の象徴。</p></div>
      <div class="stage"><div class="en">p17 — the cycle</div><h3>循環</h3><p class="small">表紙の青い月へ回帰し、少女が魔女へと静かに反転する。</p></div>
    </div>
    <div class="rule"></div>
    <div class="grid2" style="align-items:start">
      <div>${fig('world', 'ENTER THE WORLD：手続き生成の月夜の森。月を中心に、道・霧・少女と魔女の気配・記憶のリボン')}</div>
      <div>${fig('p17', 'p17：青い月の回帰と循環の気配')}</div>
      <style>section:nth-of-type(4) figure .ph{height:62mm}</style>
    </div>
    <div class="foot"><div class="small mute">WHAT SHE WANTED ・ 演出設計</div><div class="small mute">04 / 05</div></div>
  </section>

  <!-- PAGE 5 — TECH / EXHIBITION / ORIGINALITY -->
  <section class="page">
    <h2>技術・展示・独創性<span class="en">Technology · Exhibition · Originality</span></h2>
    <div class="grid2" style="align-items:start">
      <div>
        <h3 style="font-family:var(--serif);font-size:12pt;margin-bottom:1.5mm">技術構成</h3>
        <p class="small">Web AR（<b>MindAR</b> 画像認識・4ページを1ターゲットに統合）＋ <b>Three.js</b> による手続き生成の3D。月・木・枝・霧・光・記憶のリボンは<b>すべてコードで生成</b>（ARレイヤーに画像生成AIは不使用）。React・Vite・TypeScript・自作PWA。iPhone Safari 実機対応、低性能モードとreduced-motion、カメラ許可の堅牢化。無音設計。</p>
        <h3 style="font-family:var(--serif);font-size:12pt;margin:4mm 0 1.5mm">展示計画（12/4–6 ・ VS.）</h3>
        <p class="small">印刷した絵本のページと、備え付けのスマホ／タブレットでのカメラAR体験を中心に、大画面で360°世界を並置。来場者が自分でページにかざし、<b>"現実に絵本の世界がやってくる"</b>瞬間と、その奥へ入る体験を体感できる構成。</p>
      </div>
      <div>
        <h3 style="font-family:var(--serif);font-size:12pt;margin-bottom:1.5mm">独創性・AI利用について</h3>
        <p class="small">原画（下地）には生成AIを活用した箇所を含みますが、<b>物語の再構成・AR空間の設計・各ページ固有の3D演出・紙面外へのせり出し・360°世界・インタラクション・実装は、すべて作者自身の独創的かつ主体的な制作</b>によるものです。「紙とデジタルが共作して初めて物語が完成する」という体験構造そのものが本作の新規性であり、ISCAが重視する<b>作者本人の独創性・新しい表現</b>に合致します。</p>
        <div style="margin-top:4mm">${fig('p5', '')}<style>section:nth-of-type(5) figure .ph{height:44mm}</style></div>
      </div>
    </div>
    <div class="rule"></div>
    <div class="foot">
      <div>
        <div class="small">公開URL（PC/スマホで即体験）：<span style="color:var(--moon)">${URL}</span></div>
        <div class="small mute">ソース：github.com/xx0019v/what-she-wanted　／　制作：2026年</div>
      </div>
      <div class="badge"><img src="qr.png" alt="QR"></div>
    </div>
  </section>

  </body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
