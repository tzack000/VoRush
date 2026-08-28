/**
 * 洗牌袋：随机给每只怪挑一条入侵路径，但不会出现"连续多只都走同一边"。
 *
 * 纯随机会让孩子在某一侧没设防时被连续打穿（运气输，而非策略输）；
 * 严格轮流又完全可预测。折中：每袋装 copies 份全部路径，洗牌后逐个取，
 * 并额外限制同一条路最多连续 maxStreak 只。
 *
 * 默认参数（2 条路 / copies 2 / 上限 2）的保证：
 * - 同一条路不会连出 3 只（maxStreak）
 * - 每个完整的袋（4 只）恰好 2:2
 * - 长程总量均衡
 *
 * 注意：**不可能**做到"任意连续 4 只都恰好 2:2"——那要求 x[i+4] 恒等于 x[i]，
 * 序列退化成周期 4，也就没有随机性了。跨袋边界的窗口可以是 3:1，
 * 这是保留不可预测性必须付的代价。
 */
export class LaneBag {
  private bag: number[] = [];
  private last = -1;
  private streak = 0;

  constructor(
    private readonly laneCount: number,
    private readonly copies = 2,
    private readonly maxStreak = 2,
    private readonly rand: () => number = Math.random,
  ) {}

  next(): number {
    if (this.laneCount <= 1) return 0;
    if (this.bag.length === 0) this.refill();

    let i = this.bag.length - 1;
    if (this.streak >= this.maxStreak) {
      // 连击已达上限：即使跨袋边界也要换一条路
      const j = this.bag.findIndex((v) => v !== this.last);
      if (j >= 0) i = j;
    }

    const lane = this.bag.splice(i, 1)[0];
    this.streak = lane === this.last ? this.streak + 1 : 1;
    this.last = lane;
    return lane;
  }

  private refill(): void {
    this.bag = [];
    for (let c = 0; c < this.copies; c++) {
      for (let l = 0; l < this.laneCount; l++) this.bag.push(l);
    }
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  reset(): void {
    this.bag = [];
    this.last = -1;
    this.streak = 0;
  }
}
