// ────────────────────────────────────────────────────────────────
// All 17 page stories. Each is a TIMELINE, not a loop: phases fire in order from
// the moment the printed page is recognised, every phase states what it means in
// this page's story, and the subtitles cue with the beats.
//
// `sustain: false` marks a passing moment (rises then recedes) — used for things
// the story shows once. The reserved channel `stillness` slows the scene's
// breathing without pausing the timeline.
// ────────────────────────────────────────────────────────────────
import {
  createCoverScene, createNightmareScene, createThresholdScene, createForestScene,
  createContractScene, createPromiseScene, createVanishScene, createEmptinessScene,
  createSecondMeetingScene, createQuestionScene, createVioletMoonScene,
  createMemoriesScene, createStrengthScene, createOvercomeScene, createReleaseScene,
  createDreamScene, createCycleScene,
} from './scenes';
import type { PageStory } from './storyTypes';

export const PAGE_STORIES: PageStory[] = [
  // ═══════════════════════════════════════════════ p1
  {
    pageNumber: 1, targetIndex: 0, title: 'What She Wanted',
    narrativeRole: 'Before anything: a child and something patient, under the same moon.',
    theme: 'THE STORY IS ALREADY WAITING.',
    duration: 11, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'night-sky', start: 0.8, duration: 2.0, channel: 'nightSky', meaning: 'The night opens: this is a world with a sky in it.' },
      { id: 'moon', start: 1.6, duration: 2.4, channel: 'moon', meaning: 'The moon — the one thing that watches the whole story.' },
      { id: 'hill-mist', start: 3.0, duration: 2.4, channel: 'hillMist', meaning: 'The hill breathes; the ground is real.' },
      { id: 'two-of-them', start: 4.2, duration: 3.0, channel: 'twoOfThem', meaning: 'Two presences: the child in cool light, the other in violet.' },
      { id: 'sparks', start: 6.0, duration: 3.0, channel: 'sparks', meaning: 'Magic already drifting between them, before a word is spoken.' },
    ],
    subtitles: [
      { at: 2.0, hold: 4.0, en: 'WHAT SHE WANTED', jp: 'WHAT SHE WANTED', anchor: 'bottom' },
      { at: 6.6, hold: 3.8, en: 'A story beyond the printed page.', jp: '紙のページの、その先の物語。', anchor: 'bottom' },
    ],
    createScene: createCoverScene,
  },

  // ═══════════════════════════════════════════════ p2
  {
    pageNumber: 2, targetIndex: 1, title: 'Nightmare',
    narrativeRole: 'A nightmare tears her out of sleep; the room will not settle.',
    theme: 'THE DARK IS STILL IN THE ROOM.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'window-moon', start: 0.8, duration: 2.0, channel: 'windowMoon', meaning: 'The only light: the moon at the window, indifferent.' },
      { id: 'she-wakes', start: 1.6, duration: 2.0, channel: 'sheWakes', meaning: 'She is awake, small, and very still.' },
      { id: 'tendrils', start: 2.6, duration: 3.4, channel: 'tendrils', meaning: 'The nightmare has not left — it is still moving in the air.' },
      { id: 'unrest', start: 4.6, duration: 3.0, channel: 'unrest', meaning: 'The room will not settle; nothing here lets her sleep.' },
      { id: 'dread', start: 7.0, duration: 3.0, channel: 'dread', meaning: 'The dark thickens. This happens to her again and again.' },
    ],
    subtitles: [
      { at: 2.4, hold: 4.2, en: 'A nightmare tore her from her sleep.', jp: '悪夢が、彼女を眠りから引き剥がした。', anchor: 'lower-left' },
      { at: 7.4, hold: 4.0, en: 'Dark, restless shapes still drifted through the room.', jp: '暗く落ち着かない影が、まだ部屋を漂っていた。', anchor: 'lower-left' },
    ],
    createScene: createNightmareScene,
  },

  // ═══════════════════════════════════════════════ p3
  {
    pageNumber: 3, targetIndex: 2, title: 'The Door',
    narrativeRole: 'She slips out of the sleeping house and turns toward the forest.',
    theme: 'THE FOREST IS ALREADY BREATHING THROUGH THE DOOR.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'moon-beyond', start: 0.9, duration: 2.2, channel: 'moonBeyond', meaning: 'Beyond the door: the moon, waiting for her.' },
      { id: 'forest-beyond', start: 2.0, duration: 2.6, channel: 'forestBeyond', meaning: 'The trees resolve out of the dark — the forest is real.' },
      { id: 'mist-enters', start: 3.4, duration: 2.6, channel: 'mistEnters', meaning: 'Mist comes in over the threshold: the outside is entering the house.' },
      { id: 'invitation', start: 4.8, duration: 2.6, channel: 'invitation', meaning: 'Small lights appear ahead — an invitation, or a lure.' },
      { id: 'resolve', start: 6.2, duration: 2.6, channel: 'resolve', meaning: 'Her heart is trembling, and she goes anyway.' },
      { id: 'spills-in', start: 7.6, duration: 3.2, channel: 'spillsIn', meaning: 'The forest spills past the doorway into the room with you.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.4, en: 'On a quiet night, the girl stepped into the forest,', jp: '静かな夜、少女は森へと足を踏み出した。', anchor: 'lower-left' },
      { at: 7.4, hold: 4.0, en: 'her heart trembling, yet full of resolve.', jp: '胸を震わせながら、それでも決意を胸に。', anchor: 'lower-left' },
    ],
    createScene: createThresholdScene,
  },

  // ═══════════════════════════════════════════════ p4
  {
    pageNumber: 4, targetIndex: 3, title: 'Into the Forest',
    narrativeRole: 'She walks, alone and afraid, into the forest no one enters.',
    theme: 'THE FOREST AWAKENS AROUND HER.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'she-is-here', start: 0.9, duration: 1.6, channel: 'sheIsHere', meaning: 'She gains weight and breath: this page is about a person, not a place.' },
      { id: 'moon-breath', start: 1.4, duration: 1.6, channel: 'moonBreath', meaning: 'The moon lifts off the paper and begins to breathe over her.' },
      { id: 'forest-breathes', start: 2.4, duration: 2.2, channel: 'forestBreathes', meaning: 'Mist and air start moving — the forest is alive and awake.' },
      { id: 'depth', start: 3.4, duration: 3.0, channel: 'depth', meaning: 'Trees rise at four depths: the forest closes around her.' },
      { id: 'forest-notices', start: 4.6, duration: 2.6, channel: 'forestNotices', meaning: 'THE EVENT: the forest’s lights leave their places and come to her. It noticed her.' },
      { id: 'branches', start: 5.6, duration: 2.4, channel: 'branches', meaning: 'Branches lean past the paper into the room — the forest reaching out.' },
      { id: 'she-steps', start: 6.6, duration: 2.6, channel: 'sheSteps', meaning: 'Her weight shifts forward and her shadow lengthens: she is going in.' },
      { id: 'her-resolve', start: 7.4, duration: 2.6, channel: 'herResolve', meaning: 'Her own light comes up. She is afraid and she goes anyway.' },
      { id: 'overflow', start: 7.0, duration: 3.0, channel: 'overflow', meaning: 'Mist and fireflies cross the page edge — the forest is not contained.' },
      { id: 'watched', start: 8.6, duration: 1.8, channel: 'watched', sustain: false, meaning: 'Something violet watches from the trees, reaches toward her once, and withdraws.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.2, en: 'She entered the forest no one dared to enter.', jp: '誰も足を踏み入れない森へ、彼女は入っていった。', anchor: 'lower-left' },
      { at: 8.4, hold: 3.0, en: 'Something was already waiting.', jp: '何かが、すでに待っていた。', anchor: 'lower-left' },
    ],
    createScene: createForestScene,
  },

  // ═══════════════════════════════════════════════ p5
  {
    pageNumber: 5, targetIndex: 4, title: 'First Meeting',
    narrativeRole: 'She asks the witch to erase every painful memory.',
    theme: 'THE SPACE BETWEEN THEM BECOMES A PROMISE.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'the-hush', start: 0.0, duration: 1.4, channel: 'theHush', meaning: 'The held breath between a child and something ancient.' },
      { id: 'she-stands-there', start: 0.8, duration: 1.6, channel: 'sheStandsThere', meaning: 'The child gains breath and weight. She is very small next to this.' },
      { id: 'she-is-listening', start: 1.6, duration: 1.8, channel: 'sheIsListening', meaning: 'The witch gains presence — she was already there, and she is listening.' },
      { id: 'the-air', start: 2.2, duration: 2.2, channel: 'theAir', meaning: 'Air moves between them: hair, hem, mist. The space is not empty.' },
      { id: 'she-asks', start: 3.0, duration: 1.8, channel: 'sheAsks', meaning: 'She leans in and asks. This is the moment she chooses.' },
      { id: 'she-accepts', start: 4.2, duration: 2.2, channel: 'sheAccepts', meaning: 'The witch reaches out and the staff answers: the terms are accepted.' },
      { id: 'it-is-taken', start: 5.4, duration: 3.4, channel: 'itIsTaken', meaning: 'THE EVENT: memory leaves the child’s chest, crosses the gap, and arrives in the witch’s hand. Her own light goes out as it goes.' },
      { id: 'it-is-sealed', start: 8.4, duration: 2.6, channel: 'itIsSealed', meaning: 'Rings contract on the space between them. It is done, and it cannot be undone.' },
    ],
    subtitles: [
      { at: 1.8, hold: 4.4, en: '“Erase every bad memory from my mind.”', jp: '「悪い記憶を、すべて消して。」', anchor: 'lower-left' },
      { at: 7.2, hold: 3.6, en: 'In return, she offered anything.', jp: 'その代わりに、彼女は何でも差し出した。', anchor: 'lower-left' },
    ],
    createScene: createContractScene,
  },

  // ═══════════════════════════════════════════════ p6
  {
    pageNumber: 6, targetIndex: 5, title: 'The Promise',
    narrativeRole: 'She promises the witch anything she desires.',
    theme: 'A CHILD PROMISES SOMETHING SHE CANNOT MEASURE.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'open-sky', start: 0.8, duration: 2.2, channel: 'openSky', meaning: 'The forest opens out: nothing is hidden here now.' },
      { id: 'field', start: 2.0, duration: 2.4, channel: 'field', meaning: 'The ground between them, plain and quiet.' },
      { id: 'hands-meet', start: 3.2, duration: 2.4, channel: 'handsMeet', meaning: 'Their hands meet — the moment the promise becomes physical.' },
      { id: 'violet-vow', start: 4.4, duration: 3.2, channel: 'violetVow', meaning: 'Violet unspools from the joined hands: the vow taking shape.' },
      { id: 'sealed', start: 7.2, duration: 3.0, channel: 'sealed', meaning: 'Both presences settle. It is done, and she does not know what she gave.' },
    ],
    subtitles: [
      { at: 3.6, hold: 4.2, en: '“In return… I will give you anything you desire.”', jp: '「その代わり……あなたの望むものを、何でも差し上げます。」', anchor: 'lower-left' },
      { at: 8.0, hold: 3.4, en: 'She did not know what she had promised.', jp: '自分が何を約束したのか、彼女は知らなかった。', anchor: 'lower-left' },
    ],
    createScene: createPromiseScene,
  },

  // ═══════════════════════════════════════════════ p7
  {
    pageNumber: 7, targetIndex: 6, title: 'The Witch Vanishes',
    narrativeRole: 'The witch is gone, and so are the nightmares.',
    theme: 'THE BARGAIN IS KEPT. SHE IS ALONE.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'still-there', start: 0.8, duration: 2.2, channel: 'stillThere', meaning: 'The forest as it was, a heartbeat before the change.' },
      { id: 'she-was-here', start: 1.8, duration: 1.8, channel: 'sheWasHere', meaning: 'The witch is still present — violet, solid, watching.' },
      { id: 'dissolve', start: 3.2, duration: 3.0, channel: 'dissolve', sustain: false, meaning: 'She comes apart into gold and scatters outward: gone, not killed.' },
      { id: 'gold-embers', start: 4.4, duration: 3.0, channel: 'goldEmbers', meaning: 'What is left of her drifts through the whole clearing.' },
      { id: 'relief', start: 6.4, duration: 3.0, channel: 'relief', meaning: 'The air loosens past the page edge — the nightmares went with her.' },
      { id: 'alone-and-free', start: 8.2, duration: 3.0, channel: 'aloneAndFree', meaning: 'Only the girl remains, lighter and entirely alone.' },
    ],
    subtitles: [
      { at: 3.6, hold: 4.2, en: 'The witch vanished, and so did the nightmares.', jp: '魔女は消えた。悪夢も、ともに。', anchor: 'lower-left' },
      { at: 8.6, hold: 3.2, en: 'She slept. For years, she slept.', jp: '彼女は眠った。何年も、眠り続けた。', anchor: 'lower-left' },
    ],
    createScene: createVanishScene,
  },

  // ═══════════════════════════════════════════════ p8
  {
    pageNumber: 8, targetIndex: 7, title: 'Emptiness',
    narrativeRole: 'She grew up. The nightmares are gone; her heart is empty.',
    theme: 'NOTHING CAME TO FILL THE SPACE.',
    duration: 13, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'cold-moon', start: 0.9, duration: 2.4, channel: 'coldMoon', meaning: 'The same moon, but it warms nothing now.' },
      { id: 'grown', start: 2.2, duration: 2.6, channel: 'grown', meaning: 'She is an adult: taller, quieter, further away.' },
      { id: 'hollow', start: 3.8, duration: 3.4, channel: 'hollow', meaning: 'The air drains rather than fills — the colour of an empty room.' },
      { id: 'nothing-comes', start: 6.4, duration: 3.4, channel: 'nothingComes', meaning: 'Motes rise and reach nothing. Absence, held for a long time.' },
      { id: 'stillness', start: 9.6, duration: 2.4, channel: 'stillness', meaning: 'Everything slows. Emptiness does not resolve; it simply stays.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.2, en: 'Time passed, and the girl grew into an adult.', jp: '時は流れ、少女は大人になった。', anchor: 'top' },
      { at: 7.0, hold: 4.6, en: 'The nightmares were gone — and yet, her heart remained empty.', jp: '悪夢は消えたのに——その心は、空虚なままだった。', anchor: 'top' },
    ],
    createScene: createEmptinessScene,
  },

  // ═══════════════════════════════════════════════ p9
  {
    pageNumber: 9, targetIndex: 8, title: 'Second Meeting',
    narrativeRole: 'Under a pale blue moon, the witch appears before her again.',
    theme: 'THE ONE SHE PAID IS BACK.',
    duration: 12, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'pale-moon', start: 0.8, duration: 2.2, channel: 'paleMoon', meaning: 'A pale blue moon: the same night, years later.' },
      { id: 'forest-again', start: 1.8, duration: 2.8, channel: 'forestAgain', meaning: 'The forest returns around her, exactly as it was.' },
      { id: 'she-stands', start: 3.4, duration: 2.4, channel: 'sheStands', meaning: 'She stands where the child once stood.' },
      { id: 'she-present', start: 5.0, duration: 3.4, channel: 'shePresent', meaning: 'Violet gathers beside her: the witch, without warning or entrance.' },
      { id: 'stillness', start: 8.6, duration: 2.4, channel: 'stillness', meaning: 'Neither of them moves. The debt is in the room.' },
    ],
    subtitles: [
      { at: 2.4, hold: 4.0, en: 'On a night lit by a pale blue moon,', jp: '青白い月に照らされた夜、', anchor: 'lower-left' },
      { at: 5.6, hold: 4.4, en: 'the witch appeared before the girl once again.', jp: '魔女はふたたび、少女の前に現れた。', anchor: 'lower-left' },
    ],
    createScene: createSecondMeetingScene,
  },

  // ═══════════════════════════════════════════════ p10
  {
    pageNumber: 10, targetIndex: 9, title: 'The Question',
    narrativeRole: 'She asks why, with the nightmares gone, she is still unhappy.',
    theme: 'THE QUESTION HANGS IN THE GAP BETWEEN THEM.',
    duration: 13, restartPolicy: 'resume', resumeWindow: 6,
    phases: [
      { id: 'facing', start: 0.8, duration: 2.4, channel: 'facing', meaning: 'They stand facing each other; the forest holds still for it.' },
      { id: 'she-asks', start: 2.2, duration: 2.4, channel: 'sheAsks', meaning: 'Her light gathers: she is the one speaking now.' },
      { id: 'the-gap', start: 3.8, duration: 3.0, channel: 'theGap', meaning: 'The question travels the space between them, slowly.' },
      { id: 'she-listens', start: 5.4, duration: 2.6, channel: 'sheListens', meaning: 'The witch does not answer yet. She lets it stand.' },
      { id: 'unanswered', start: 7.4, duration: 3.4, channel: 'unanswered', meaning: 'Violet seeps in around the unanswered question.' },
      { id: 'stillness', start: 10.0, duration: 2.4, channel: 'stillness', meaning: 'A long pause before the truth arrives.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.4, en: '“The nightmares are gone, and my memories were erased…', jp: '「悪夢も消え、記憶も消したのに……', anchor: 'lower-left' },
      { at: 7.4, hold: 4.2, en: 'So why am I still not happy?”', jp: 'どうして私は、まだ幸せじゃないの？」', anchor: 'lower-left' },
    ],
    createScene: createQuestionScene,
  },

  // ═══════════════════════════════════════════════ p11
  {
    pageNumber: 11, targetIndex: 10, title: 'Violet Moon',
    narrativeRole: 'The witch speaks, and the moon takes on the colour of memory.',
    theme: 'THE MOON REMEMBERS WHAT SHE FORGOT.',
    duration: 14, restartPolicy: 'restart', resumeWindow: 3,
    phases: [
      { id: 'blue-moon', start: 0.0, duration: 2.0, channel: 'blueMoon', meaning: 'The moon as it was: blue, and telling her nothing.' },
      { id: 'violet-seep', start: 2.0, duration: 4.0, channel: 'violetSeep', meaning: 'Memory soaks into the moon from within — never a flash.' },
      { id: 'propagate', start: 4.0, duration: 3.0, channel: 'propagate', meaning: 'The violet spreads to mist and air: everything remembers with it.' },
      { id: 'memory-rings', start: 6.0, duration: 3.0, channel: 'memoryRings', meaning: 'Rings form around the moon: the layers of what she gave away.' },
      { id: 'stillness', start: 9.0, duration: 2.0, channel: 'stillness', meaning: 'Everything slows almost to rest. The image is allowed to be looked at.' },
    ],
    subtitles: [
      { at: 2.4, hold: 4.0, en: 'The moon slowly began to turn violet.', jp: '月は、ゆっくりと紫に染まっていった。', anchor: 'bottom' },
      { at: 9.4, hold: 4.0, en: 'Memory has a colour. She had simply stopped seeing it.', jp: '記憶には色がある。彼女はただ、見なくなっていた。', anchor: 'bottom' },
    ],
    createScene: createVioletMoonScene,
  },

  // ═══════════════════════════════════════════════ p12
  {
    pageNumber: 12, targetIndex: 11, title: 'Memories',
    narrativeRole: 'The witch names what was taken: pain, regret, betrayal.',
    theme: 'EVERYTHING SHE ERASED IS STANDING AROUND HER.',
    duration: 14, restartPolicy: 'restart', resumeWindow: 4,
    phases: [
      { id: 'gently', start: 0.8, duration: 2.4, channel: 'gently', meaning: 'The witch speaks gently. Violet settles over everything.' },
      { id: 'they-gather', start: 2.4, duration: 3.4, channel: 'theyGather', meaning: 'Half-seen figures rise around her: every memory she deleted.' },
      { id: 'the-pain', start: 4.6, duration: 3.4, channel: 'thePain', meaning: 'Pain, regret, wounds given and received — moving, not still.' },
      { id: 'she-stands-among', start: 6.8, duration: 2.6, channel: 'sheStandsAmong', meaning: 'She stands among them, arms folded, refusing to look.' },
      { id: 'all-of-it', start: 9.0, duration: 3.0, channel: 'allOfIt', meaning: 'All of it, at once, encircling her. This was the price.' },
      { id: 'stillness', start: 11.6, duration: 2.0, channel: 'stillness', meaning: 'The crowd stops moving. She has to see them.' },
    ],
    subtitles: [
      { at: 1.6, hold: 4.4, en: 'Memories filled with pain and agony.', jp: '痛みと苦しみに満ちた記憶。', anchor: 'lower-left' },
      { at: 6.2, hold: 4.4, en: 'Regrets that burn deep. The sting of betrayal.', jp: '深く焼けつく後悔。そして裏切りの痛み。', anchor: 'lower-left' },
      { at: 11.0, hold: 2.8, en: 'All of it, she had thrown away.', jp: 'そのすべてを、彼女は捨てたのだ。', anchor: 'lower-left' },
    ],
    createScene: createMemoriesScene,
  },

  // ═══════════════════════════════════════════════ p13
  {
    pageNumber: 13, targetIndex: 12, title: 'Strength',
    narrativeRole: 'Those who carry such memories become stronger; happiness is their reward.',
    theme: 'WHAT SHE THREW AWAY WAS HER STRENGTH.',
    duration: 14, restartPolicy: 'restart', resumeWindow: 4,
    phases: [
      { id: 'kneeling', start: 0.8, duration: 2.4, channel: 'kneeling', meaning: 'She is down on one knee: the truth has landed.' },
      { id: 'carried', start: 2.2, duration: 3.0, channel: 'carried', meaning: 'The memories are still there, but quieter — carried, not fought.' },
      { id: 'rising-light', start: 4.2, duration: 3.4, channel: 'risingLight', meaning: 'Light rises through her from the ground: what pain becomes.' },
      { id: 'becomes-strength', start: 6.6, duration: 3.2, channel: 'becomesStrength', meaning: 'It resolves into standing threads — strength, made visible.' },
      { id: 'reward', start: 9.4, duration: 3.0, channel: 'reward', meaning: 'True happiness: a reward granted only to those who carried it.' },
      { id: 'stillness', start: 11.8, duration: 2.0, channel: 'stillness', meaning: 'The light holds. Nothing more needs to happen.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.6, en: 'Those who carry such memories become stronger, fiercer, more resilient.', jp: 'そうした記憶を抱えて生きる者ほど、より強く、しなやかになっていく。', anchor: 'lower-left' },
      { at: 9.8, hold: 4.0, en: 'True happiness is a reward granted only to them.', jp: '本当の幸せは、そんな彼らにだけ与えられる報酬なの。', anchor: 'lower-left' },
    ],
    createScene: createStrengthScene,
  },

  // ═══════════════════════════════════════════════ p14
  {
    pageNumber: 14, targetIndex: 13, title: 'Overcome',
    narrativeRole: 'Do not forget. Do not erase. Overcome it — or stay a child forever.',
    theme: 'THE ONLY WAY THROUGH IS THROUGH.',
    duration: 13, restartPolicy: 'restart', resumeWindow: 3,
    phases: [
      { id: 'she-speaks', start: 0.6, duration: 2.4, channel: 'sheSpeaks', meaning: 'The witch fills the frame. This is the centre of the fable.' },
      { id: 'halo', start: 2.0, duration: 3.0, channel: 'halo', meaning: 'Rings open behind her: not decoration — authority.' },
      { id: 'her-words', start: 3.6, duration: 3.4, channel: 'herWords', meaning: 'Her words travel outward past the page: do not erase it, overcome it.' },
      { id: 'or-stay-a-child', start: 6.6, duration: 3.4, channel: 'orStayAChild', meaning: 'The other half of the sentence, and the threat inside it.' },
      { id: 'stillness', start: 10.0, duration: 2.4, channel: 'stillness', meaning: 'She stops. The choice is now the girl’s.' },
    ],
    subtitles: [
      { at: 2.4, hold: 4.4, en: 'So — do not forget. Do not try to erase it. Overcome it.', jp: 'だから——忘れないで。消そうとしないで。乗り越えなさい。', anchor: 'upper-left' },
      { at: 7.0, hold: 4.6, en: 'If you cannot, you will remain a child, forever unable to grow.', jp: 'それができなければ、あなたは子どものまま、永遠に成長できない。', anchor: 'upper-left' },
    ],
    createScene: createOvercomeScene,
  },

  // ═══════════════════════════════════════════════ p15
  {
    pageNumber: 15, targetIndex: 14, title: 'Release',
    narrativeRole: 'She says thank you, and in that moment she is freed.',
    theme: 'GRATITUDE IS WHAT BREAKS IT.',
    duration: 13, restartPolicy: 'resume', resumeWindow: 5,
    phases: [
      { id: 'quiet-forest', start: 0.8, duration: 2.4, channel: 'quietForest', meaning: 'A quieter forest: no threat left in it.' },
      { id: 'she-speaks-thanks', start: 2.4, duration: 2.6, channel: 'sheSpeaksThanks', meaning: 'She gathers herself and says the one word that matters.' },
      { id: 'threads-rise', start: 4.0, duration: 3.2, channel: 'threadsRise', meaning: 'Threads of light stand up from the ground: the spell letting go.' },
      { id: 'freed', start: 6.4, duration: 3.4, channel: 'freed', meaning: 'It streams outward off the page — the nightmares actually leaving.' },
      { id: 'lighter', start: 9.2, duration: 3.0, channel: 'lighter', meaning: 'What is left is light, and it is hers.' },
    ],
    subtitles: [
      { at: 2.8, hold: 3.6, en: 'The girl spoke to the witch. “Thank you.”', jp: '少女は魔女に言った。「ありがとう。」', anchor: 'upper-left' },
      { at: 6.8, hold: 4.4, en: 'And in that very moment, she was freed from her nightmares.', jp: 'その瞬間、彼女は悪夢から解き放たれた。', anchor: 'upper-left' },
    ],
    createScene: createReleaseScene,
  },

  // ═══════════════════════════════════════════════ p16
  {
    pageNumber: 16, targetIndex: 15, title: 'Her Own Dream',
    narrativeRole: 'She no longer fears her nightmares and walks toward her own dream.',
    theme: 'SHE IS THE LIGHT NOW.',
    duration: 13, restartPolicy: 'resume', resumeWindow: 5,
    phases: [
      { id: 'no-longer-afraid', start: 0.8, duration: 2.4, channel: 'noLongerAfraid', meaning: 'The forest is still dark, and it no longer matters.' },
      { id: 'her-light', start: 2.2, duration: 2.8, channel: 'herLight', meaning: 'The light is coming from her, not from the moon.' },
      { id: 'the-veil', start: 3.8, duration: 3.6, channel: 'theVeil', meaning: 'It opens outward past the page like a veil — almost wings.' },
      { id: 'her-own-dream', start: 6.6, duration: 3.0, channel: 'herOwnDream', meaning: 'She is entirely herself: this is her dream, not a bargain.' },
      { id: 'forward', start: 8.8, duration: 3.2, channel: 'forward', meaning: 'The ground ahead lights up. She is already walking.' },
    ],
    subtitles: [
      { at: 2.6, hold: 4.0, en: 'The girl no longer feared her nightmares.', jp: '少女はもう、悪夢を恐れなかった。', anchor: 'bottom' },
      { at: 7.2, hold: 4.4, en: 'She began walking forward, eyes fixed on her own dream.', jp: '自分自身の夢だけを見つめ、彼女は前へと歩き出した。', anchor: 'bottom' },
    ],
    createScene: createDreamScene,
  },

  // ═══════════════════════════════════════════════ p17
  {
    pageNumber: 17, targetIndex: 16, title: 'The Cycle',
    narrativeRole: 'The girl walks on — and the one left behind is the new witch.',
    theme: 'SHE BECAME THE ONE WHO WAS WAITING.',
    duration: 14, restartPolicy: 'restart', resumeWindow: 3,
    phases: [
      { id: 'departure', start: 0.0, duration: 3.0, channel: 'departure', meaning: 'Read as a farewell: she is walking away, free.' },
      { id: 'moon-returns', start: 3.0, duration: 3.0, channel: 'moonReturns', meaning: 'The moon returns to the cover’s blue: we are back at the beginning.' },
      { id: 'watcher-violet', start: 5.0, duration: 4.0, channel: 'watcherViolet', meaning: 'THE REVEAL: what the girl carried drains out of her, travels back, and is received by the one who stayed. Her violet grows by exactly what the girl loses.' },
      { id: 'opening-mist', start: 7.0, duration: 3.0, channel: 'openingMist', meaning: 'The first page’s mist drifts again: the loop has closed.' },
      { id: 'continuation', start: 10.0, duration: 3.0, channel: 'continuation', meaning: 'Her hand reaches past the page. The next wish is already out there.' },
    ],
    subtitles: [
      { at: 0.8, hold: 3.4, en: 'She walked on, toward her own dream.', jp: '彼女は自分の夢へと歩き出した。', anchor: 'upper-left' },
      { at: 5.4, hold: 4.2, en: 'But no one noticed who had stayed behind.', jp: 'けれど、誰も気づかなかった——残った者が誰なのかを。', anchor: 'upper-left' },
      { at: 10.2, hold: 3.6, en: 'The witch was waiting to grant someone else’s wish.', jp: '魔女は、次の誰かの願いを待っていた。', anchor: 'upper-left' },
    ],
    createScene: createCycleScene,
  },
];

export const storyForPage = (page: number): PageStory | undefined =>
  PAGE_STORIES.find((s) => s.pageNumber === page);

export const storyForTargetIndex = (index: number): PageStory | undefined =>
  PAGE_STORIES.find((s) => s.targetIndex === index);

/** Pages in target-index order — matches the compiled pages.mind. */
export const AR_PAGE_ORDER = PAGE_STORIES.slice()
  .sort((a, b) => a.targetIndex - b.targetIndex)
  .map((s) => s.pageNumber);
