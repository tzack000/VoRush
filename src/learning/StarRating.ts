import type { WordBook } from './WordBook';

export interface StarResult {
  /** 通关星：守住关卡 */
  clear: boolean;
  /** 认识星：本关 4 个新词都至少独立答对一次 */
  know: boolean;
  /** 复习星：至少 3 个新词在两种题型中独立答对，其余词完成引导纠正 */
  review: boolean;
}

/** 复习星要求的"两种题型独立答对"的词数下限 */
export const REVIEW_STAR_MIN_FULL_WORDS = 3;

export function computeStars(
  passed: boolean,
  book: WordBook,
  wordIds: string[],
): StarResult {
  if (!passed) return { clear: false, know: false, review: false };

  const know = wordIds.every((id) => book.hasIndependent(id));
  const fullWords = wordIds.filter(
    (id) => book.independentTypes(id).length >= 2,
  ).length;
  const review =
    fullWords >= REVIEW_STAR_MIN_FULL_WORDS &&
    wordIds.every(
      (id) => book.independentTypes(id).length >= 2 || book.isGuided(id),
    );

  return { clear: true, know, review };
}
