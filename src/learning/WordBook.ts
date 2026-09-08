/** 单词学习记录：P0 使用词义辨认（看图选词）与听音辨认（听音选图）两个维度。 */
export type QuestionType = 'listen-pick-image' | 'see-image-pick-word';

export const QUESTION_TYPES: QuestionType[] = ['listen-pick-image', 'see-image-pick-word'];

/** 答题结果：第一次独立答对 / 第二次尝试答对 / 提示引导完成 */
export type AnswerOutcome = 'first-try' | 'second-try' | 'guided';

export interface WordRecordData {
  /** 战前认识已完成 */
  taught: boolean;
  attempts: number;
  wrongs: number;
  /** 最近一次是否答错（用于选题优先级） */
  lastWrong: boolean;
  /** 已独立答对过的题型 */
  independentTypes: QuestionType[];
  /** 是否曾通过提示引导完成 */
  guided: boolean;
  /** 间隔复习熟练度 0～3；缺省按已独立答对题型数推断 */
  strength: number;
  /** 上次答题/复习时间（ms）；0 表示从未复习 */
  lastReviewedAt: number;
}

/** 学习记录键：按词包隔离。关卡与复习巡逻共用，勿在别处拼键。 */
export function bookKey(packId: string): string {
  return `vorush.records.${packId}`;
}

function emptyRecord(): WordRecordData {
  return {
    taught: false,
    attempts: 0,
    wrongs: 0,
    lastWrong: false,
    independentTypes: [],
    guided: false,
    strength: 0,
    lastReviewedAt: 0,
  };
}

function clampStrength(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.floor(n)));
}

function inferStrength(independentTypes: QuestionType[]): number {
  return clampStrength(independentTypes.length);
}

function storageGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // iPad 隐私模式等场景降级为纯内存
  }
}

export class WordBook {
  private data: Record<string, WordRecordData> = {};

  constructor(
    private readonly wordIds: string[],
    initial?: Record<string, Partial<WordRecordData>>,
  ) {
    for (const id of wordIds) {
      const raw = initial?.[id] ?? {};
      const merged: WordRecordData = { ...emptyRecord(), ...raw };
      if (raw.strength === undefined) {
        merged.strength = inferStrength(merged.independentTypes ?? []);
      } else {
        merged.strength = clampStrength(merged.strength);
      }
      if (raw.lastReviewedAt === undefined || !Number.isFinite(raw.lastReviewedAt)) {
        merged.lastReviewedAt = 0;
      }
      this.data[id] = merged;
    }
  }

  /** 从 localStorage 恢复；失败或不存在时返回全新记录 */
  static load(storageKey: string, wordIds: string[]): WordBook {
    const raw = storageGet(storageKey);
    if (!raw) return new WordBook(wordIds);
    try {
      const parsed = JSON.parse(raw) as Record<string, Partial<WordRecordData>>;
      return new WordBook(wordIds, parsed);
    } catch {
      return new WordBook(wordIds);
    }
  }

  /** 旧键一次性迁移到新键（新键已存在或旧键不存在时不动作） */
  static migrate(oldKey: string, newKey: string): void {
    const raw = storageGet(oldKey);
    if (raw === null) return;
    if (storageGet(newKey) === null) storageSet(newKey, raw);
    try {
      globalThis.localStorage?.removeItem(oldKey);
    } catch {
      // 忽略
    }
  }

  save(storageKey: string): void {
    storageSet(storageKey, JSON.stringify(this.data));
  }

  private rec(id: string): WordRecordData {
    const r = this.data[id];
    if (!r) throw new Error(`unknown word: ${id}`);
    return r;
  }

  markTaught(id: string): void {
    this.rec(id).taught = true;
  }

  recordAnswer(id: string, type: QuestionType, outcome: AnswerOutcome, now: number = Date.now()): void {
    const r = this.rec(id);
    r.attempts += 1;
    r.lastReviewedAt = now;
    if (outcome === 'guided') {
      r.guided = true;
      r.wrongs += 1;
      r.lastWrong = true; // 引导完成不算独立掌握，保持优先复现
      r.strength = 0;
    } else {
      if (!r.independentTypes.includes(type)) r.independentTypes.push(type);
      if (outcome === 'second-try') r.wrongs += 1;
      r.lastWrong = false;
      r.strength = clampStrength(r.strength + 1);
    }
  }

  /** 是否曾在任意题型独立答对 */
  hasIndependent(id: string): boolean {
    return this.rec(id).independentTypes.length >= 1;
  }

  independentTypes(id: string): readonly QuestionType[] {
    return this.rec(id).independentTypes;
  }

  isGuided(id: string): boolean {
    return this.rec(id).guided;
  }

  isLastWrong(id: string): boolean {
    return this.rec(id).lastWrong;
  }

  isTaught(id: string): boolean {
    return this.rec(id).taught;
  }

  /** 战前展示过或有过答题，才算已学 */
  hasProgress(id: string): boolean {
    const r = this.rec(id);
    return r.taught || r.attempts > 0 || r.independentTypes.length > 0;
  }

  strength(id: string): number {
    return this.rec(id).strength;
  }

  lastReviewedAt(id: string): number {
    return this.rec(id).lastReviewedAt;
  }
}
