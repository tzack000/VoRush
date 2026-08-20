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
}

function emptyRecord(): WordRecordData {
  return {
    taught: false,
    attempts: 0,
    wrongs: 0,
    lastWrong: false,
    independentTypes: [],
    guided: false,
  };
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
      this.data[id] = { ...emptyRecord(), ...(initial?.[id] ?? {}) };
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

  recordAnswer(id: string, type: QuestionType, outcome: AnswerOutcome): void {
    const r = this.rec(id);
    r.attempts += 1;
    if (outcome === 'guided') {
      r.guided = true;
      r.wrongs += 1;
      r.lastWrong = true; // 引导完成不算独立掌握，保持优先复现
    } else {
      if (!r.independentTypes.includes(type)) r.independentTypes.push(type);
      if (outcome === 'second-try') r.wrongs += 1;
      r.lastWrong = false;
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
}
