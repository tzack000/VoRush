import { getWord, LEVEL_WORDS, type WordDef } from '../data/words';
import type { QuestionType } from '../learning/WordBook';

export interface QuizOption {
  wordId: string;
  /** 选项展示内容：emoji 或英文词形 */
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  wordId: string;
  type: QuestionType;
  /** 听音选图：播放发音；看图选词：展示 promptEmoji */
  promptEmoji: string;
  options: QuizOption[];
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成一道题：1 个正确项 + 3 个干扰项（取自本关其余词），
 * 一屏最多 4 个答案。
 */
export function generateQuestion(
  wordId: string,
  type: QuestionType,
  rng: () => number = Math.random,
): QuizQuestion {
  const word = getWord(wordId);
  const distractors = shuffled(
    LEVEL_WORDS.filter((w: WordDef) => w.id !== wordId),
    rng,
  ).slice(0, 3);

  const options = shuffled(
    [word, ...distractors].map((w) => ({
      wordId: w.id,
      label: type === 'listen-pick-image' ? w.emoji : w.text,
      isCorrect: w.id === wordId,
    })),
    rng,
  );

  return { wordId, type, promptEmoji: word.emoji, options };
}
