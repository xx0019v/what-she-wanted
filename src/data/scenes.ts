// ────────────────────────────────────────────────────────────────
// WHAT SHE WANTED — canonical scene data
// The picture (page image) shows what happened.
// The digital layer (motion, light, subtitle) reveals what remained inside her.
// English is authoritative; Japanese is a faithful translation.
// ────────────────────────────────────────────────────────────────

export type SubtitleStyle = 'narration' | 'dialogue';

export interface SceneMotion {
  /** Parallax intensity of the base page image (0 = still, 1 = strong). */
  parallax: number;
  /** Slow luminance "breathing" amplitude. */
  breath: number;
  /** Named atmospheric layers rendered above the page. */
  fx: Array<
    | 'nightmareRibbons'
    | 'moonPulse'
    | 'fog'
    | 'fireflies'
    | 'memoryParticles'
    | 'violetSwirl'
    | 'goldDust'
    | 'desaturate'
    | 'memoryFigures'
    | 'risingLight'
    | 'violetMoon'
    | 'lightRibbons'
    | 'lightPath'
    | 'cycleGlow'
  >;
  /** Focal point (0..1 of image) the parallax gravitates toward. */
  focus: [number, number];
}

export interface Scene {
  id: number;
  code: string;
  title: string;
  image: string;
  /** Subtitle lines. */
  en: string[];
  jp: string[];
  style: SubtitleStyle;
  /** Subtitle anchor — matches where the page leaves negative space. */
  anchor: 'bottom-left' | 'bottom-center' | 'top-left' | 'top-right' | 'center-left';
  motion: SceneMotion;
}

// WebP derivatives (≈89% smaller); the .jpg originals remain in public/pages.
const P = (n: number) => `${import.meta.env.BASE_URL}pages/${n}.webp`;

export const SCENES: Scene[] = [
  {
    id: 1,
    code: 'COVER',
    title: 'What She Wanted',
    image: P(1),
    en: ['WHAT SHE WANTED', 'A story beyond the printed page.'],
    jp: ['WHAT SHE WANTED', '紙のページの、その先の物語。'],
    style: 'narration',
    anchor: 'bottom-center',
    motion: { parallax: 0.25, breath: 0.4, fx: ['moonPulse', 'fog'], focus: [0.5, 0.4] },
  },
  {
    id: 2,
    code: 'NIGHTMARE',
    title: 'Nightmare',
    image: P(2),
    en: ['A nightmare tore her from her sleep.', 'Dark, restless shapes still drifted through the room.'],
    jp: ['悪夢が、彼女を眠りから引き剥がした。', '暗く落ち着かない影が、まだ部屋を漂っていた。'],
    style: 'narration',
    anchor: 'bottom-left',
    motion: { parallax: 0.35, breath: 0.7, fx: ['nightmareRibbons', 'moonPulse'], focus: [0.5, 0.55] },
  },
  {
    id: 3,
    code: 'THE DOOR',
    title: 'The Door',
    image: P(3),
    en: ['She slipped out of the sleeping house', 'and turned toward the forest.'],
    jp: ['彼女は眠る家をそっと抜け出し', '森へと歩き出した。'],
    style: 'narration',
    anchor: 'bottom-left',
    motion: { parallax: 0.45, breath: 0.4, fx: ['fog'], focus: [0.55, 0.5] },
  },
  {
    id: 4,
    code: 'INTO THE FOREST',
    title: 'Into the Forest',
    image: P(4),
    en: ['Alone, she walked into the quiet forest', 'that no one else dared to enter.'],
    jp: ['誰も足を踏み入れない静かな森へ', '彼女はひとり、分け入っていった。'],
    style: 'narration',
    anchor: 'bottom-center',
    motion: { parallax: 0.55, breath: 0.4, fx: ['fog', 'fireflies'], focus: [0.5, 0.55] },
  },
  {
    id: 5,
    code: 'FIRST MEETING',
    title: 'First Meeting',
    image: P(5),
    en: ['The girl spoke to the witch.', '“Please… I never want to see another nightmare.', 'Erase all the bad memories from my mind.”'],
    jp: ['少女は魔女に語りかけた。', '「お願い……もう二度と悪夢を見たくないの。', '悪い記憶を、すべて消して。」'],
    style: 'dialogue',
    anchor: 'bottom-left',
    motion: { parallax: 0.3, breath: 0.5, fx: ['fog', 'memoryParticles'], focus: [0.62, 0.45] },
  },
  {
    id: 6,
    code: 'THE PROMISE',
    title: 'The Promise',
    image: P(6),
    en: ['The girl said,', '“In return…', 'I will give you anything you desire.”'],
    jp: ['少女は言った。', '「その代わり……', 'あなたの望むものを、何でも差し上げます。」'],
    style: 'dialogue',
    anchor: 'center-left',
    motion: { parallax: 0.3, breath: 0.5, fx: ['violetSwirl', 'memoryParticles'], focus: [0.5, 0.4] },
  },
  {
    id: 7,
    code: 'THE WITCH VANISHES',
    title: 'The Witch Vanishes',
    image: P(7),
    en: ['The witch vanished,', 'and so did the nightmares.'],
    jp: ['魔女は消えた。', '悪夢も、ともに。'],
    style: 'narration',
    anchor: 'center-left',
    motion: { parallax: 0.35, breath: 0.5, fx: ['goldDust', 'fireflies', 'fog'], focus: [0.5, 0.55] },
  },
  {
    id: 8,
    code: 'EMPTINESS',
    title: 'Emptiness',
    image: P(8),
    en: ['Time passed, and the girl grew into an adult.', 'The nightmares were gone—', 'and yet, her heart remained empty.'],
    jp: ['時は流れ、少女は大人になった。', '悪夢は消えたのに——', 'その心は、空虚なままだった。'],
    style: 'narration',
    anchor: 'top-right',
    motion: { parallax: 0.28, breath: 0.3, fx: ['desaturate', 'fog'], focus: [0.45, 0.45] },
  },
  {
    id: 9,
    code: 'SECOND MEETING',
    title: 'Second Meeting',
    image: P(9),
    en: ['On a night lit by a pale blue moon,', 'the witch appeared before the girl once again.'],
    jp: ['青白い月に照らされた夜、', '魔女はふたたび、少女の前に現れた。'],
    style: 'narration',
    anchor: 'center-left',
    motion: { parallax: 0.35, breath: 0.5, fx: ['fog', 'moonPulse'], focus: [0.6, 0.45] },
  },
  {
    id: 10,
    code: 'THE QUESTION',
    title: 'The Question',
    image: P(10),
    en: ['The girl asked the witch,', '“The nightmares are gone, and my memories were erased…', 'So why am I still not happy?”'],
    jp: ['少女は魔女に問うた。', '「悪夢も消え、記憶も消したのに……', 'どうして私は、まだ幸せじゃないの？」'],
    style: 'dialogue',
    anchor: 'bottom-left',
    motion: { parallax: 0.3, breath: 0.4, fx: ['fog', 'memoryParticles', 'violetSwirl'], focus: [0.5, 0.45] },
  },
  {
    id: 11,
    code: 'VIOLET MOON',
    title: 'Violet Moon',
    image: P(11),
    en: ['The moon slowly began to turn violet.'],
    jp: ['月は、ゆっくりと紫へ染まっていった。'],
    style: 'narration',
    anchor: 'bottom-left',
    motion: { parallax: 0.4, breath: 0.6, fx: ['violetMoon', 'fog'], focus: [0.5, 0.4] },
  },
  {
    id: 12,
    code: 'MEMORIES',
    title: 'Memories',
    image: P(12),
    en: ['The witch spoke gently.', 'Memories filled with pain and agony. A reality so harsh one longs to escape.', 'Regrets that burn deep, wounds given and received. The sting of betrayal.'],
    jp: ['魔女は静かに語った。', '痛みと苦しみに満ちた記憶。逃げ出したくなるほど、過酷な現実。', '深く焼けつく後悔、与え、与えられた傷。そして裏切りの痛み。'],
    style: 'dialogue',
    anchor: 'center-left',
    motion: { parallax: 0.3, breath: 0.5, fx: ['memoryFigures', 'violetSwirl'], focus: [0.5, 0.5] },
  },
  {
    id: 13,
    code: 'STRENGTH',
    title: 'Strength',
    image: P(13),
    en: ['Those who carry such memories in the corners of their hearts—', 'they become stronger, fiercer, and more resilient.', 'True happiness… is a reward granted only to them.'],
    jp: ['そうした記憶を、心の片隅に抱えて生きる者ほど——', 'より強く、より逞しく、しなやかになっていく。', '本当の幸せは……そんな彼らにだけ与えられる報酬なの。'],
    style: 'dialogue',
    anchor: 'center-left',
    motion: { parallax: 0.3, breath: 0.5, fx: ['risingLight', 'memoryParticles'], focus: [0.55, 0.45] },
  },
  {
    id: 14,
    code: 'OVERCOME',
    title: 'Overcome',
    image: P(14),
    en: ['So—do not forget, dear girl. Do not try to erase it. Overcome it.', 'If you cannot, you will remain a child, forever unable to grow.'],
    jp: ['だから——忘れないで、いとしい子。消そうとしないで。乗り越えなさい。', 'それができなければ、あなたは子どものまま、永遠に成長できない。'],
    style: 'dialogue',
    anchor: 'top-left',
    motion: { parallax: 0.22, breath: 0.5, fx: ['violetSwirl', 'cycleGlow'], focus: [0.5, 0.4] },
  },
  {
    id: 15,
    code: 'RELEASE',
    title: 'Release',
    image: P(15),
    en: ['The girl spoke to the witch. “Thank you.”', 'And in that very moment, she was freed from her nightmares.'],
    jp: ['少女は魔女に言った。「ありがとう。」', 'その瞬間、彼女は悪夢から解き放たれた。'],
    style: 'dialogue',
    anchor: 'top-left',
    motion: { parallax: 0.35, breath: 0.5, fx: ['lightRibbons', 'fog'], focus: [0.55, 0.45] },
  },
  {
    id: 16,
    code: 'HER OWN DREAM',
    title: 'Her Own Dream',
    image: P(16),
    en: ['The girl no longer feared her nightmares.', 'She began walking forward, eyes fixed on her own dream.'],
    jp: ['少女はもう、悪夢を恐れなかった。', '自分自身の夢だけを見つめ、彼女は前へと歩き出した。'],
    style: 'narration',
    anchor: 'bottom-center',
    motion: { parallax: 0.4, breath: 0.5, fx: ['lightRibbons', 'lightPath', 'risingLight'], focus: [0.5, 0.45] },
  },
  {
    id: 17,
    code: 'THE CYCLE',
    title: 'The Cycle',
    image: P(17),
    en: ['But no one noticed. That the girl who once suffered… had become the witch.', 'And that the witch was now waiting to grant someone else’s wish.'],
    jp: ['だが、誰も気づかなかった。かつて苦しんだ少女が……魔女になっていたことに。', 'そしてその魔女が、次の誰かの願いを待っていたことに。'],
    style: 'narration',
    anchor: 'top-left',
    motion: { parallax: 0.45, breath: 0.5, fx: ['cycleGlow', 'fog', 'moonPulse'], focus: [0.5, 0.45] },
  },
];

export const sceneById = (id: number) => SCENES.find((s) => s.id === id) ?? SCENES[0];
export const PRIORITY_SCENES = [4, 5, 11];
