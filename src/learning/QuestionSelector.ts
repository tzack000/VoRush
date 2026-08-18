import type { QuestionType, WordBook } from './WordBook';

/**
 * 波间固定练习选题优先级（P0 简化版）：
 * 1. 本关新词（尚未在任何题型独立答对）
 * 2. 最近答错的词
 * 3. 只在单一题型中答对的词
 * 4. 已熟练词（两种题型都答对）——用于巩固填充
 */
export function pickPracticeWords(
  book: WordBook,
  wordIds: string[],
  count: number,
): string[] {
  const fresh = wordIds.filter((id) => !book.hasIndependent(id) && !book.isLastWrong(id));
  const recentlyWrong = wordIds.filter((id) => book.isLastWrong(id));
  const singleType = wordIds.filter(
    (id) =>
      book.hasIndependent(id) &&
      !book.isLastWrong(id) &&
      book.independentTypes(id).length === 1,
  );
  const mastered = wordIds.filter(
    (id) => book.independentTypes(id).length >= 2 && !book.isLastWrong(id),
  );

  const ordered = [...fresh, ...recentlyWrong, ...singleType, ...mastered];
  const result: string[] = [];
  let i = 0;
  while (result.length < count && ordered.length > 0) {
    result.push(ordered[i % ordered.length]);
    i += 1;
  }
  return result;
}

/**
 * 为某个词选择题��：优先出该词尚未独立答对过的题型；
 * 两种题型都已答对则随机（可注入 rng 便于测试）。
 */
export function pickTypeFor(
  book: WordBook,
  wordId: string,
  rng: () => number = Math.random,
): QuestionType {
  const types = book.independentTypes(wordId);
  if (!types.includes('listen-pick-image')) return 'listen-pick-image';
  if (!types.includes('see-image-pick-word')) return 'see-image-pick-word';
  return rng() < 0.5 ? 'listen-pick-image' : 'see-image-pick-word';
}
