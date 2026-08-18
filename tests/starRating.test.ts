import { describe, expect, it } from 'vitest';
import { WordBook } from '../src/learning/WordBook';
import { computeStars } from '../src/learning/StarRating';

const IDS = ['cat', 'dog', 'bird', 'fish'];

function bookWith(
  fn: (b: WordBook) => void,
): WordBook {
  const b = new WordBook(IDS);
  fn(b);
  return b;
}

describe('computeStars 三星判定', () => {
  it('未通关时三星皆无', () => {
    const b = bookWith((bk) => {
      for (const id of IDS) bk.recordAnswer(id, 'listen-pick-image', 'first-try');
    });
    expect(computeStars(false, b, IDS)).toEqual({
      clear: false,
      know: false,
      review: false,
    });
  });

  it('仅守住关卡（有词从未独立答对）只得通关星', () => {
    const b = bookWith((bk) => {
      bk.recordAnswer('cat', 'listen-pick-image', 'first-try');
      bk.recordAnswer('dog', 'see-image-pick-word', 'guided');
      // bird、fish 从未答对
    });
    const s = computeStars(true, b, IDS);
    expect(s).toEqual({ clear: true, know: false, review: false });
  });

  it('4 词都至少独立答对一次获得认识星', () => {
    const b = bookWith((bk) => {
      for (const id of IDS) bk.recordAnswer(id, 'listen-pick-image', 'second-try');
    });
    const s = computeStars(true, b, IDS);
    expect(s.clear).toBe(true);
    expect(s.know).toBe(true);
    expect(s.review).toBe(false);
  });

  it('至少 3 词两种题型独立答对、其余引导完成，获得复习星（fish 仅引导完成，认识星不满足）', () => {
    const b = bookWith((bk) => {
      for (const id of ['cat', 'dog', 'bird']) {
        bk.recordAnswer(id, 'listen-pick-image', 'first-try');
        bk.recordAnswer(id, 'see-image-pick-word', 'first-try');
      }
      bk.recordAnswer('fish', 'listen-pick-image', 'guided');
    });
    expect(computeStars(true, b, IDS)).toEqual({
      clear: true,
      know: false,
      review: true,
    });
  });

  it('不足 3 词双题型答对时无复习星', () => {
    const b = bookWith((bk) => {
      for (const id of ['cat', 'dog']) {
        bk.recordAnswer(id, 'listen-pick-image', 'first-try');
        bk.recordAnswer(id, 'see-image-pick-word', 'first-try');
      }
      bk.recordAnswer('bird', 'listen-pick-image', 'first-try');
      bk.recordAnswer('fish', 'listen-pick-image', 'guided');
    });
    const s = computeStars(true, b, IDS);
    expect(s.review).toBe(false);
  });
});
