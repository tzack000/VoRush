import { describe, expect, it } from 'vitest';
import { WordBook } from '../src/learning/WordBook';
import { pickPracticeWords, pickTypeFor } from '../src/learning/QuestionSelector';

const IDS = ['cat', 'dog', 'bird', 'fish'];

describe('pickPracticeWords 选题优先级', () => {
  it('全部是新词时全部入选', () => {
    const b = new WordBook(IDS);
    expect(pickPracticeWords(b, IDS, 4)).toEqual(IDS);
  });

  it('新词优先于最近答错的词', () => {
    const b = new WordBook(IDS);
    b.recordAnswer('cat', 'listen-pick-image', 'guided'); // cat 最近答错（引导完成）
    b.recordAnswer('dog', 'listen-pick-image', 'first-try');
    b.recordAnswer('dog', 'see-image-pick-word', 'first-try'); // dog 熟练
    const picked = pickPracticeWords(b, IDS, 2);
    // 新词 bird、fish 应排最前
    expect(picked.slice(0, 2)).toEqual(['bird', 'fish']);
  });

  it('最近答错优先于单一题型答对的词', () => {
    const b = new WordBook(IDS);
    for (const id of IDS) b.recordAnswer(id, 'listen-pick-image', 'first-try');
    b.recordAnswer('cat', 'see-image-pick-word', 'guided'); // cat 最近答错
    // dog/bird/fish 仅单一题型答对
    const picked = pickPracticeWords(b, IDS, 4);
    expect(picked[0]).toBe('cat');
  });

  it('选题数量不足时循环填充', () => {
    const b = new WordBook(IDS);
    const picked = pickPracticeWords(b, IDS, 6);
    expect(picked).toHaveLength(6);
  });
});

describe('pickTypeFor 题型选择', () => {
  it('优先出尚未独立答对过的题型', () => {
    const b = new WordBook(IDS);
    expect(pickTypeFor(b, 'cat')).toBe('listen-pick-image');
    b.recordAnswer('cat', 'listen-pick-image', 'first-try');
    expect(pickTypeFor(b, 'cat')).toBe('see-image-pick-word');
  });

  it('两种题型都答对后按 rng 随机', () => {
    const b = new WordBook(IDS);
    b.recordAnswer('cat', 'listen-pick-image', 'first-try');
    b.recordAnswer('cat', 'see-image-pick-word', 'first-try');
    expect(pickTypeFor(b, 'cat', () => 0.1)).toBe('listen-pick-image');
    expect(pickTypeFor(b, 'cat', () => 0.9)).toBe('see-image-pick-word');
  });
});
