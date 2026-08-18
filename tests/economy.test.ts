import { describe, expect, it } from 'vitest';
import { GoldWallet } from '../src/economy/GoldWallet';
import { ECONOMY } from '../src/data/economy';

describe('GoldWallet', () => {
  it('初始资金为 120，足够建造一座基础塔', () => {
    const w = new GoldWallet();
    expect(w.balance).toBe(120);
    expect(w.canAfford(100)).toBe(true);
  });

  it('按答题结果发放金币：首对 25 / 次对 20 / 提示 15', () => {
    const w = new GoldWallet(0);
    expect(w.rewardFor('first-try')).toBe(ECONOMY.firstTryCorrect);
    expect(w.rewardFor('second-try')).toBe(ECONOMY.secondTryCorrect);
    expect(w.rewardFor('guided')).toBe(ECONOMY.guidedComplete);
    expect(w.balance).toBe(25 + 20 + 15);
  });

  it('提示完成后仍有金币（失败保护）', () => {
    const w = new GoldWallet(0);
    w.rewardFor('guided');
    expect(w.balance).toBeGreaterThan(0);
  });

  it('金币不足时 spend 失败且不扣款', () => {
    const w = new GoldWallet(50);
    expect(w.spend(100)).toBe(false);
    expect(w.balance).toBe(50);
    expect(w.spend(50)).toBe(true);
    expect(w.balance).toBe(0);
  });

  it('补给箱奖励在 10～15 区间内', () => {
    const w = new GoldWallet(0);
    expect(w.supplyCrateReward(() => 0)).toBe(10);
    expect(w.supplyCrateReward(() => 0.999)).toBe(15);
  });

  it('击杀敌人不掉建造金币', () => {
    expect(ECONOMY.killReward).toBe(0);
  });
});
