import { describe, expect, it } from 'vitest';
import { bookKey, WordBook } from '../src/learning/WordBook';

const IDS = ['cat', 'dog', 'bird', 'fish'];

describe('bookKey', () => {
  it('按词包拼学习记录键', () => {
    expect(bookKey('animals-1')).toBe('vorush.records.animals-1');
    expect(bookKey('t1d1')).toBe('vorush.records.t1d1');
  });
});

describe('WordBook 成长字段', () => {
  it('独立答对提升熟练度并写下复习时间', () => {
    const b = new WordBook(IDS);
    b.recordAnswer('cat', 'listen-pick-image', 'first-try', 1000);
    expect(b.strength('cat')).toBe(1);
    expect(b.lastReviewedAt('cat')).toBe(1000);
    b.recordAnswer('cat', 'see-image-pick-word', 'first-try', 2000);
    expect(b.strength('cat')).toBe(2);
    expect(b.lastReviewedAt('cat')).toBe(2000);
    expect(b.independentTypes('cat')).toEqual(['listen-pick-image', 'see-image-pick-word']);
  });

  it('引导完成重置熟练度为 0 并记最近答错', () => {
    const b = new WordBook(IDS);
    b.recordAnswer('dog', 'listen-pick-image', 'first-try', 1000);
    b.recordAnswer('dog', 'see-image-pick-word', 'first-try', 2000);
    b.recordAnswer('dog', 'listen-pick-image', 'guided', 3000);
    expect(b.strength('dog')).toBe(0);
    expect(b.isLastWrong('dog')).toBe(true);
    expect(b.independentTypes('dog')).toEqual(['listen-pick-image', 'see-image-pick-word']);
    expect(b.lastReviewedAt('dog')).toBe(3000);
  });

  it('熟练度上限 3', () => {
    const b = new WordBook(IDS);
    b.recordAnswer('bird', 'listen-pick-image', 'first-try', 1);
    b.recordAnswer('bird', 'see-image-pick-word', 'first-try', 2);
    b.recordAnswer('bird', 'listen-pick-image', 'first-try', 3);
    b.recordAnswer('bird', 'see-image-pick-word', 'first-try', 4);
    expect(b.strength('bird')).toBe(3);
  });

  it('旧记录缺字段按独立题型数推断熟练度，不丢答题历史', () => {
    const b = new WordBook(IDS, {
      cat: {
        taught: true,
        attempts: 4,
        wrongs: 1,
        lastWrong: false,
        independentTypes: ['listen-pick-image', 'see-image-pick-word'],
        guided: false,
      },
    });
    expect(b.isTaught('cat')).toBe(true);
    expect(b.independentTypes('cat')).toEqual(['listen-pick-image', 'see-image-pick-word']);
    expect(b.strength('cat')).toBe(2);
    expect(b.lastReviewedAt('cat')).toBe(0);
    expect(b.hasProgress('cat')).toBe(true);
  });

  it('未教过且无答题的词不算已学', () => {
    const b = new WordBook(IDS);
    expect(b.hasProgress('fish')).toBe(false);
    b.markTaught('fish');
    expect(b.hasProgress('fish')).toBe(true);
  });
});
