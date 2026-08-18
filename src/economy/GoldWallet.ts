import { ECONOMY } from '../data/economy';
import type { AnswerOutcome } from '../learning/WordBook';

/** 金币钱包：纯学习经济，所有建造/升级金币来自答题。 */
export class GoldWallet {
  private gold: number;

  constructor(startingGold: number = ECONOMY.startingGold) {
    this.gold = startingGold;
  }

  get balance(): number {
    return this.gold;
  }

  earn(amount: number): void {
    this.gold += amount;
  }

  /** 金币不足时返回 false，不扣款 */
  spend(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  /** 按答题结果发放金币 */
  rewardFor(outcome: AnswerOutcome): number {
    const amount =
      outcome === 'first-try'
        ? ECONOMY.firstTryCorrect
        : outcome === 'second-try'
          ? ECONOMY.secondTryCorrect
          : ECONOMY.guidedComplete;
    this.earn(amount);
    return amount;
  }

  /** 补给箱奖励（10～15 随机，可注入 rng 便于测试） */
  supplyCrateReward(rng: () => number = Math.random): number {
    const span = ECONOMY.supplyCrateMax - ECONOMY.supplyCrateMin + 1;
    const amount = ECONOMY.supplyCrateMin + Math.floor(rng() * span);
    this.earn(amount);
    return amount;
  }
}
