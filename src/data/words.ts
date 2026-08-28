/**
 * VoRush 词库（纯数据）。
 * 动物主题包 + 学校默书包（保良局何寿南小学 P.1 2025-2026，
 * 来源：00_input/Dict_P1_T1~T3.pdf；多词短语按核心词提取）。
 */
export interface WordDef {
  id: string;
  text: string;
  emoji: string;
  audioKey: string;
}

export interface WordPack {
  id: string;
  name: string;
  /** 展示用主 emoji */
  emoji: string;
  words: WordDef[];
}

function w(id: string, emoji: string): WordDef {
  return { id, text: id, emoji, audioKey: `word_${id}` };
}

export const WORD_PACKS: WordPack[] = [
  {
    id: 'animals-1',
    name: '动物伙伴',
    emoji: '🐱',
    words: [w('cat', '🐱'), w('dog', '🐶'), w('bird', '🐦'), w('fish', '🐟')],
  },
  {
    id: 't1d1',
    name: 'T1 默书 1 · 新朋友',
    emoji: '👋',
    words: [
      w('monitor', '🙋'),
      w('classmate', '🧑‍🤝‍🧑'),
      w('teacher', '🧑‍🏫'),
      w('goodbye', '👋'),
      w('table', '🍽️'),
      w('tiger', '🐯'),
      w('tree', '🌳'),
      w('toe', '🦶'),
      w('toy', '🧸'),
    ],
  },
  {
    id: 't1d2',
    name: 'T1 默书 2 · 好邻居',
    emoji: '🏠',
    words: [
      w('grandfather', '👴'),
      w('mother', '👩'),
      w('friend', '🫂'),
      w('playmates', '🧒'),
      w('baby', '👶'),
      w('ball', '⚽'),
      w('bed', '🛏️'),
      w('book', '📖'),
      w('boy', '👦'),
    ],
  },
  {
    id: 't1d3',
    name: 'T1 默书 3 · 英语室',
    emoji: '💻',
    words: [
      w('computer', '💻'),
      w('desk', '🗄️'),
      w('chair', '🪑'),
      w('board', '📋'),
      w('one', '1️⃣'),
      w('two', '2️⃣'),
      w('three', '3️⃣'),
      w('four', '4️⃣'),
      w('five', '5️⃣'),
    ],
  },
  {
    id: 't2d1',
    name: 'T2 默书 1 · 身体部位',
    emoji: '👁️',
    words: [
      w('feet', '👣'),
      w('fingers', '🖐️'),
      w('toes', '🦶'),
      w('eye', '👁️'),
      w('angry', '😠'),
      w('ant', '🐜'),
      w('apple', '🍎'),
      w('ask', '🙋'),
      w('aunt', '👩‍🦰'),
    ],
  },
  {
    id: 't2d2',
    name: 'T2 默书 2 · 动物园',
    emoji: '🐼',
    words: [
      w('elephant', '🐘'),
      w('panda', '🐼'),
      w('zebra', '🦓'),
      w('monkey', '🐵'),
      w('tiger', '🐯'),
      w('rabbit', '🐰'),
      w('man', '👨'),
      w('mat', '🧘'),
      w('milk', '🥛'),
      w('moon', '🌙'),
      w('mouse', '🐭'),
    ],
  },
  {
    id: 't2d3',
    name: 'T2 默书 3 · 水果乐园',
    emoji: '🍉',
    words: [
      w('peaches', '🍑'),
      w('mangoes', '🥭'),
      w('blueberries', '🫐'),
      w('cherries', '🍒'),
      w('bananas', '🍌'),
      w('watermelon', '🍉'),
      w('sad', '😢'),
      w('say', '💬'),
      w('ship', '🚢'),
      w('star', '⭐'),
      w('sun', '☀️'),
    ],
  },
  {
    id: 't3d1',
    name: 'T3 默书 1 · 动作故事',
    emoji: '📖',
    words: [
      w('draw', '✏️'),
      w('drink', '🥤'),
      w('laugh', '😄'),
      w('walk', '🚶'),
      w('eat', '🍽️'),
      w('sleep', '😴'),
      w('fast', '🏃'),
      w('feel', '🫶'),
      w('find', '🔍'),
      w('full', '🈵'),
      w('fun', '🎉'),
    ],
  },
  {
    id: 't3d2',
    name: 'T3 默书 2 · 宠物朋友',
    emoji: '🐹',
    words: [
      w('goldfish', '🐠'),
      w('hamster', '🐹'),
      w('parrot', '🦜'),
      w('rabbit', '🐰'),
      w('run', '🏃‍♂️'),
      w('talk', '🗣️'),
      w('date', '📅'),
      w('dish', '🍽️'),
      w('doctor', '👨‍⚕️'),
      w('door', '🚪'),
      w('dress', '👗'),
    ],
  },
];

export function getPack(packId: string): WordPack {
  const p = WORD_PACKS.find((x) => x.id === packId);
  if (!p) throw new Error(`unknown pack: ${packId}`);
  return p;
}

export function getWordIn(pack: WordPack, wordId: string): WordDef {
  const word = pack.words.find((x) => x.id === wordId);
  if (!word) throw new Error(`unknown word ${wordId} in pack ${pack.id}`);
  return word;
}
