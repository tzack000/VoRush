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
