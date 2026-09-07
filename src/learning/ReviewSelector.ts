import { LEVELS } from '../data/levels';
import { clearedLevelIds, readReview, type ProgressStorage } from '../data/progress';
import { getPack, type WordDef } from '../data/words';
import { bookKey, WordBook } from './WordBook';

/** 间隔表（初始参考值，待试玩校准）：熟练度 0 立即到期，1=1 天，2=3 天，3=7 天 */
export const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_INTERVALS_MS = [0, DAY_MS, 3 * DAY_MS, 7 * DAY_MS] as const;
export const REVIEW_QUESTION_COUNT = 6;

export interface ReviewCandidate {
  wordId: string;
  packId: string;
}

export interface ReviewPack {
  packId: string;
  words: WordDef[];
  book: WordBook;
}

export interface ReviewInspect {
  unlocked: boolean;
  dueCount: number;
  learnedCount: number;
  completedCount: number;
}

export function intervalFor(strength: number): number {
  const i = Math.max(0, Math.min(REVIEW_INTERVALS_MS.length - 1, Math.floor(strength)));
  return REVIEW_INTERVALS_MS[i];
}

/** 最近答错或从未复习立即到期；否则按熟练度间隔 */
export function isReviewDue(book: WordBook, wordId: string, now: number): boolean {
  if (book.isLastWrong(wordId)) return true;
  const last = book.lastReviewedAt(wordId);
  if (last <= 0) return true;
  return now >= last + intervalFor(book.strength(wordId));
}

export function collectLearnedWords(packs: ReviewPack[]): ReviewCandidate[] {
  const out: ReviewCandidate[] = [];
  for (const pack of packs) {
    for (const word of pack.words) {
      if (pack.book.hasProgress(word.id)) {
        out.push({ wordId: word.id, packId: pack.packId });
      }
    }
  }
  return out;
}

export function countDueWords(packs: ReviewPack[], now: number): number {
  let n = 0;
  for (const item of collectLearnedWords(packs)) {
    const pack = packs.find((p) => p.packId === item.packId);
    if (pack && isReviewDue(pack.book, item.wordId, now)) n += 1;
  }
  return n;
}

/**
 * 优先级：最近答错 → 间隔到期 → 其余已学（较久未复习优先）。
 * 数量不足时循环填充。
 */
export function pickReviewWords(
  packs: ReviewPack[],
  count: number,
  now: number,
): ReviewCandidate[] {
  const learned = collectLearnedWords(packs);
  if (learned.length === 0 || count <= 0) return [];

  const bookOf = (packId: string): WordBook => {
    const pack = packs.find((p) => p.packId === packId);
    if (!pack) throw new Error(`unknown review pack: ${packId}`);
    return pack.book;
  };

  const wrong: ReviewCandidate[] = [];
  const due: ReviewCandidate[] = [];
  const rest: ReviewCandidate[] = [];
  for (const item of learned) {
    const book = bookOf(item.packId);
    if (book.isLastWrong(item.wordId)) wrong.push(item);
    else if (isReviewDue(book, item.wordId, now)) due.push(item);
    else rest.push(item);
  }
  rest.sort((a, b) => bookOf(a.packId).lastReviewedAt(a.wordId) - bookOf(b.packId).lastReviewedAt(b.wordId));

  const ordered = [...wrong, ...due, ...rest];
  const result: ReviewCandidate[] = [];
  let i = 0;
  while (result.length < count && ordered.length > 0) {
    result.push(ordered[i % ordered.length]);
    i += 1;
  }
  return result;
}

/** 已通关关卡对应的词包（去重）+ 各自 WordBook */
export function loadReviewPacks(storage?: ProgressStorage | null): ReviewPack[] {
  const cleared = clearedLevelIds(storage ?? undefined);
  const seen = new Set<string>();
  const packs: ReviewPack[] = [];
  for (const lv of LEVELS) {
    if (!cleared.has(lv.id) || seen.has(lv.packId)) continue;
    seen.add(lv.packId);
    const pack = getPack(lv.packId);
    const wordIds = pack.words.map((w) => w.id);
    packs.push({
      packId: pack.id,
      words: pack.words,
      book: WordBook.load(bookKey(pack.id), wordIds),
    });
  }
  return packs;
}

export function inspectReview(
  now: number = Date.now(),
  storage?: ProgressStorage | null,
): ReviewInspect {
  const packs = loadReviewPacks(storage);
  const learned = collectLearnedWords(packs);
  return {
    unlocked: clearedLevelIds(storage ?? undefined).size >= 1,
    dueCount: countDueWords(packs, now),
    learnedCount: learned.length,
    completedCount: readReview(storage).completedCount,
  };
}
