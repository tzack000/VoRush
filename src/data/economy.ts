/**
 * 纯学习经济数值表（初始参考值，待试玩校准）。
 * 设计依据：核心玩法设计 v0.1 —— 金币全部来自学习，击杀不掉金币。
 */
export const ECONOMY = {
  /** 关卡初始资金 */
  startingGold: 120,
  /** 第一次独立答对 */
  firstTryCorrect: 25,
  /** 第二次尝试答对 */
  secondTryCorrect: 20,
  /** 使用提示后完成 */
  guidedComplete: 15,
  /** 补给箱奖励区间 */
  supplyCrateMin: 10,
  supplyCrateMax: 15,
  /** 击杀敌人掉落的建造金币（纯学习经济：恒为 0） */
  killReward: 0,
  /** 每波前固定练习题数 */
  practiceQuestionsPerRound: 4,
  /** 波次数 */
  waveCount: 3,
} as const;
