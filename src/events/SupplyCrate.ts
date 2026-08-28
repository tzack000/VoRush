import type { Pt2 } from '../data/levelMaps';
import { sfx } from '../audio/sfx';

export interface SupplyCrateHooks {
  /** 补给箱出现（控制器创建 3D 模型与拾取目标），坐标为 2D 逻辑像素 */
  onSpawn: (x2d: number, y2d: number) => void;
  /** 视图清理（自然消失、被点击或波次结束） */
  onClear: () => void;
  /** 玩家点击：控制器打开答题并暂停战斗 */
  onTrigger: () => void;
}

const SPAWN_DELAY_MIN_MS = 6000;
const SPAWN_DELAY_MAX_MS = 12000;
const DESPAWN_MS = 20000;

/**
 * 补给箱（纯逻辑）：战斗中随机出现，仅提示不弹题；
 * 超时未点自动消失，无惩罚。每波至多一个（控制器每波创建一次）。
 */
export class SupplyCrate {
  private spawnTimer: number;
  private lifeTimer = 0;
  private spawned = false;
  private done = false;

  constructor(
    private positions: ReadonlyArray<Pt2>,
    private hooks: SupplyCrateHooks,
  ) {
    this.spawnTimer =
      SPAWN_DELAY_MIN_MS + Math.random() * (SPAWN_DELAY_MAX_MS - SPAWN_DELAY_MIN_MS);
  }

  /** 仅战斗未暂停时驱动 */
  update(dtMs: number): void {
    if (this.done) return;

    if (!this.spawned) {
      this.spawnTimer -= dtMs;
      if (this.spawnTimer <= 0) {
        this.spawned = true;
        const [x, y] = this.positions[Math.floor(Math.random() * this.positions.length)];
        sfx.crate();
        this.hooks.onSpawn(x, y);
      }
      return;
    }

    this.lifeTimer += dtMs;
    if (this.lifeTimer >= DESPAWN_MS) {
      // 忽略无惩罚
      this.done = true;
      this.hooks.onClear();
    }
  }

  /** 玩家点击（由拾取器回调） */
  trigger(): void {
    if (this.done || !this.spawned) return;
    this.done = true;
    this.hooks.onClear();
    this.hooks.onTrigger();
  }

  /** 波次结束时强制清理 */
  destroy(): void {
    if (this.done) return;
    this.done = true;
    if (this.spawned) this.hooks.onClear();
  }
}
