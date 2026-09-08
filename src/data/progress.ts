import { LEVELS } from './levels';
import type { StarResult } from '../learning/StarRating';

/** 可注入的 storage（测试用假实现）；默认浏览器 localStorage */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EMPTY: StarResult = { clear: false, know: false, review: false };

function defaultStorage(): ProgressStorage | null {
  const ls = globalThis.localStorage;
  return ls ?? null;
}

export function clearKey(levelId: string): string {
  return `vorush.clear.${levelId}`;
}

/** 读取关卡星级（缺失或坏数据回退为未通关） */
export function readClear(levelId: string, storage: ProgressStorage | null = defaultStorage()): StarResult {
  if (!storage) return { ...EMPTY };
  try {
    const raw = storage.getItem(clearKey(levelId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StarResult>;
    return {
      clear: parsed.clear === true,
      know: parsed.know === true,
      review: parsed.review === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeClear(
  levelId: string,
  stars: StarResult,
  storage: ProgressStorage | null = defaultStorage(),
): void {
  storage?.setItem(clearKey(levelId), JSON.stringify(stars));
}

/** 已通关（拿到通关星）的关卡 id 集合 */
export function clearedLevelIds(storage: ProgressStorage | null = defaultStorage()): Set<string> {
  const ids = new Set<string>();
  for (const lv of LEVELS) {
    if (readClear(lv.id, storage).clear) ids.add(lv.id);
  }
  return ids;
}

export function starCount(stars: StarResult): number {
  return [stars.clear, stars.know, stars.review].filter(Boolean).length;
}

/** 复习巡逻进度（完成次数），与通关键并列，由本模块统一读写 */
export const REVIEW_KEY = 'vorush.review';

export interface ReviewMeta {
  completedCount: number;
  lastCompletedAt: number;
}

const EMPTY_REVIEW: ReviewMeta = { completedCount: 0, lastCompletedAt: 0 };

export function readReview(storage: ProgressStorage | null = defaultStorage()): ReviewMeta {
  if (!storage) return { ...EMPTY_REVIEW };
  try {
    const raw = storage.getItem(REVIEW_KEY);
    if (!raw) return { ...EMPTY_REVIEW };
    const parsed = JSON.parse(raw) as Partial<ReviewMeta>;
    const completedCount = Number(parsed.completedCount);
    const lastCompletedAt = Number(parsed.lastCompletedAt);
    return {
      completedCount: Number.isFinite(completedCount) && completedCount > 0 ? Math.floor(completedCount) : 0,
      lastCompletedAt: Number.isFinite(lastCompletedAt) && lastCompletedAt > 0 ? lastCompletedAt : 0,
    };
  } catch {
    return { ...EMPTY_REVIEW };
  }
}

export function writeReview(
  meta: ReviewMeta,
  storage: ProgressStorage | null = defaultStorage(),
): void {
  storage?.setItem(REVIEW_KEY, JSON.stringify(meta));
}

/** 完成一轮复习巡逻：次数 +1，记下此刻 */
export function markReviewComplete(
  now: number = Date.now(),
  storage: ProgressStorage | null = defaultStorage(),
): ReviewMeta {
  const next: ReviewMeta = {
    completedCount: readReview(storage).completedCount + 1,
    lastCompletedAt: now,
  };
  writeReview(next, storage);
  return next;
}
