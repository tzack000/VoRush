import type { WordDef } from '../data/words';
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
  /** 正确词（音频播放与 emoji 题面直接使用，无需再查表） */
  word: WordDef;
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
 * 生成一道题：1 个正确项 + 3 个干扰项（取自当前词包内其余词），
 * 一屏最多 4 个答案。
 */
export function generateQuestion(
  wordId: string,
  type: QuestionType,
  packWords: WordDef[],
  rng: () => number = Math.random,
): QuizQuestion {
  const word = packWords.find((x) => x.id === wordId);
  if (!word) throw new Error(`unknown word: ${wordId}`);
  const distractors = shuffled(
    packWords.filter((x) => x.id !== wordId),
    rng,
  ).slice(0, 3);

  const options = shuffled(
    [word, ...distractors].map((x) => ({
      wordId: x.id,
      label: type === 'listen-pick-image' ? x.emoji : x.text,
      isCorrect: x.id === wordId,
    })),
    rng,
  );

  return { wordId, type, word, options };
}
