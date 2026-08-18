/** 1-1 草原哨站单词包：cat / dog / bird / fish */
export interface WordDef {
  id: string;
  text: string;
  emoji: string;
  audioKey: string;
}

export const LEVEL_WORDS: WordDef[] = [
  { id: 'cat', text: 'cat', emoji: '🐱', audioKey: 'word_cat' },
  { id: 'dog', text: 'dog', emoji: '🐶', audioKey: 'word_dog' },
  { id: 'bird', text: 'bird', emoji: '🐦', audioKey: 'word_bird' },
  { id: 'fish', text: 'fish', emoji: '🐟', audioKey: 'word_fish' },
];

export const LEVEL_WORD_IDS = LEVEL_WORDS.map((w) => w.id);

export function getWord(id: string): WordDef {
  const w = LEVEL_WORDS.find((x) => x.id === id);
  if (!w) throw new Error(`unknown word: ${id}`);
  return w;
}
