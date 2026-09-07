import { describe, expect, it } from 'vitest';
import { WordBook } from '../src/learning/WordBook';
import {
  collectLearnedWords,
  countDueWords,
  DAY_MS,
  isReviewDue,
  pickReviewWords,
  REVIEW_QUESTION_COUNT,
  type ReviewPack,
} from '../src/learning/ReviewSelector';
import { getPack } from '../src/data/words';

function packWith(book: WordBook, packId = 'animals-1'): ReviewPack {
  return { packId, words: getPack(packId).words, book };
}

describe('isReviewDue', () => {
  it('熟练度 1 当天未到期，约 24 小时后到期', () => {
    const b = new WordBook(['cat']);
    b.recordAnswer('cat', 'listen-pick-image', 'first-try', 10_000);
    expect(isReviewDue(b, 'cat', 10_000)).toBe(false);
    expect(isReviewDue(b, 'cat', 10_000 + DAY_MS - 1)).toBe(false);
    expect(isReviewDue(b, 'cat', 10_000 + DAY_MS)).toBe(true);
  });

  it('最近答错立即到期', () => {
    const b = new WordBook(['cat']);
    b.recordAnswer('cat', 'listen-pick-image', 'guided', 10_000);
    expect(isReviewDue(b, 'cat', 10_000)).toBe(true);
  });

  it('从未复习（旧记录）立即到期', () => {
    const b = new WordBook(['cat'], {
      cat: { taught: true, independentTypes: ['listen-pick-image'] },
    });
    expect(b.lastReviewedAt('cat')).toBe(0);
    expect(isReviewDue(b, 'cat', 1)).toBe(true);
  });
});

describe('collectLearnedWords / pickReviewWords', () => {
  it('未教过的词不入池', () => {
    const b = new WordBook(['cat', 'dog', 'bird', 'fish']);
    b.markTaught('cat');
    b.recordAnswer('dog', 'listen-pick-image', 'first-try', 1);
    const learned = collectLearnedWords([packWith(b)]);
    expect(learned.map((x) => x.wordId).sort()).toEqual(['cat', 'dog']);
  });

  it('答错词排在到期词前面', () => {
    const b = new WordBook(['cat', 'dog', 'bird', 'fish']);
    for (const id of ['cat', 'dog', 'bird', 'fish']) b.markTaught(id);
    b.recordAnswer('dog', 'listen-pick-image', 'first-try', 1);
    // dog 熟练度 1，1 天后到期
    const later = 1 + DAY_MS;
    b.recordAnswer('cat', 'listen-pick-image', 'guided', later);
    const picked = pickReviewWords([packWith(b)], 1, later);
    expect(picked[0]?.wordId).toBe('cat');
  });

  it('数量不足时循环填充到 6 题', () => {
    const b = new WordBook(['cat', 'dog', 'bird', 'fish']);
    b.markTaught('cat');
    b.markTaught('dog');
    const picked = pickReviewWords([packWith(b)], REVIEW_QUESTION_COUNT, 1);
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((x) => x.wordId))).toEqual(new Set(['cat', 'dog']));
  });

  it('未到期的熟练词最后填充', () => {
    const now = 50_000;
    const b = new WordBook(['cat', 'dog', 'bird', 'fish']);
    for (const id of ['cat', 'dog', 'bird', 'fish']) b.markTaught(id);
    b.recordAnswer('cat', 'listen-pick-image', 'guided', now);
    b.recordAnswer('dog', 'listen-pick-image', 'first-try', now);
    b.recordAnswer('bird', 'listen-pick-image', 'first-try', now);
    b.recordAnswer('fish', 'listen-pick-image', 'first-try', now);
    const picked = pickReviewWords([packWith(b)], 6, now);
    expect(picked[0]?.wordId).toBe('cat');
    expect(picked).toHaveLength(6);
    expect(countDueWords([packWith(b)], now)).toBe(1);
  });

  it('只收集传入词包，不会串包', () => {
    const animals = new WordBook(['cat', 'dog', 'bird', 'fish']);
    animals.markTaught('cat');
    const t1 = new WordBook(getPack('t1d1').words.map((w) => w.id));
    t1.markTaught('monitor');
    const learned = collectLearnedWords([packWith(animals)]);
    expect(learned.every((x) => x.packId === 'animals-1')).toBe(true);
    expect(learned.map((x) => x.wordId)).toEqual(['cat']);
  });
});
