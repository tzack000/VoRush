import { describe, expect, it } from 'vitest';
import { LaneBag } from '../src/combat/LaneBag';
import { mulberry32 } from '../src/data/rng';

describe('洗牌袋分路', () => {
  it('单路径关卡恒返回 0', () => {
    const bag = new LaneBag(1);
    for (let i = 0; i < 20; i++) expect(bag.next()).toBe(0);
  });

  it('双路：总量均衡，短窗口也不会一边倒', () => {
    const bag = new LaneBag(2, 2, 2, mulberry32(1));
    const seq: number[] = [];
    for (let i = 0; i < 400; i++) seq.push(bag.next());

    const ones = seq.filter((v) => v === 1).length;
    expect(Math.abs(ones - (seq.length - ones))).toBeLessThanOrEqual(2);

    // 任意连续 8 只都不许偏超过 2（"每 4 只恰好 2:2" 会退化成周期 4，不可取）
    for (let i = 0; i + 8 <= seq.length; i++) {
      const window = seq.slice(i, i + 8);
      const a = window.filter((v) => v === 0).length;
      expect(Math.abs(a - (8 - a)), `窗口 ${i} 分布 ${window.join('')}`).toBeLessThanOrEqual(2);
    }
  });

  it('双路：同一条路不会连出 3 只', () => {
    const bag = new LaneBag(2, 2, 2, mulberry32(7));
    let prev = -1;
    let streak = 0;
    for (let i = 0; i < 500; i++) {
      const lane = bag.next();
      streak = lane === prev ? streak + 1 : 1;
      expect(streak).toBeLessThanOrEqual(2);
      prev = lane;
    }
  });

  it('双路：顺序不可预测（不同种子给出不同序列）', () => {
    const a: number[] = [];
    const b: number[] = [];
    const bagA = new LaneBag(2, 2, 2, mulberry32(11));
    const bagB = new LaneBag(2, 2, 2, mulberry32(99));
    for (let i = 0; i < 40; i++) {
      a.push(bagA.next());
      b.push(bagB.next());
    }
    expect(a.join('')).not.toBe(b.join(''));
  });

  it('reset 之后重新装袋：接下来的 4 只仍然各 2 只', () => {
    const bag = new LaneBag(2, 2, 2, mulberry32(3));
    for (let i = 0; i < 7; i++) bag.next(); // 停在一袋中间
    bag.reset();
    const counts = [0, 0];
    for (let i = 0; i < 4; i++) counts[bag.next()] += 1;
    expect(counts).toEqual([2, 2]);
  });

  it('三条路同样均衡且不连出 3 只', () => {
    const bag = new LaneBag(3, 2, 2, mulberry32(5));
    let prev = -1;
    let streak = 0;
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const lane = bag.next();
      counts[lane] += 1;
      streak = lane === prev ? streak + 1 : 1;
      expect(streak).toBeLessThanOrEqual(2);
      prev = lane;
    }
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
});
