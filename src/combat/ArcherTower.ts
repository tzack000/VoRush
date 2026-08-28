import { ARCHER_TOWER } from '../data/towers';
import type { Enemy } from './Enemy';

/**
 * 弓箭塔（纯逻辑）：快速攻击射程内单个敌人（优先打走得最远的）。
 * 坐标使用 2D 逻辑像素（1280×720），表现层负责映射到 3D。
 */
export class ArcherTower {
  readonly kind = 'archer' as const;
  level = 0;
  private cooldown = 0;

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  get stats() {
    return ARCHER_TOWER.levels[this.level];
  }

  get canUpgrade(): boolean {
    return this.stats.upgradeCost !== null;
  }

  get upgradeCost(): number | null {
    return this.stats.upgradeCost;
  }

  upgrade(): void {
    if (this.canUpgrade) this.level += 1;
  }

  /** 索敌并开火；未开火返回 null。伤害结算由调用方统一处理。 */
  updateTower(dtMs: number, enemies: Enemy[]): { target: Enemy; damage: number } | null {
    this.cooldown -= dtMs;
    if (this.cooldown > 0) return null;

    let best: Enemy | null = null;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = Math.hypot(this.x - e.x, this.y - e.z);
      // 多条路径长度不同，dist 不可比；用"离哨站多远"挑最紧急的目标
      if (d <= this.stats.range && (!best || e.remaining < best.remaining)) best = e;
    }
    if (!best) return null;

    this.cooldown = this.stats.fireIntervalMs;
    return { target: best, damage: this.stats.damage };
  }
}
