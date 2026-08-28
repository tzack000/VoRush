import type { EnemyDef } from '../data/waves';
import type { Path } from './Path';

/** 骑士等拦截者的最小接口（避免循环依赖） */
export interface Blocker {
  readonly alive: boolean;
  takeDamage(amount: number): void;
}

export type EnemyUpdateResult = 'alive' | 'exited';

const ENEMY_ATTACK_INTERVAL_MS = 1000;

/**
 * 敌人（纯逻辑）：沿路径推进、被拦截交战、生命。
 * 表现层（3D 模型/血条）由视图绑定读取 x/z/hp 同步。
 */
export class Enemy {
  hp: number;
  readonly maxHp: number;
  readonly def: EnemyDef;
  /** 已沿路径行进的距离（世界单位） */
  dist = 0;
  blockedBy: Blocker | null = null;
  /** 当前世界坐标（由 updateEnemy 维护） */
  x = 0;
  z = 0;
  /** 视图标记：被移除后视图停止同步 */
  active = true;
  /** 所属路径：多路径关卡里每只怪各走一条 */
  readonly path: Path;
  /** 终点的守护目标 id（突破时用于定位反馈） */
  readonly goalId: string;
  /** 横向微偏移，避免共享前缀上的敌人完全重叠 */
  readonly lateral: number;
  private attackCd = 0;

  constructor(def: EnemyDef, path: Path, goalId: string, lateral = 0) {
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.path = path;
    this.goalId = goalId;
    this.lateral = lateral;
    const start = path.pointAt(0, lateral);
    this.x = start.x;
    this.z = start.z;
  }

  /** 距哨站还剩多远：路径长度不同时 dist 不可比，塔索敌要用这个 */
  get remaining(): number {
    return this.path.length - this.dist;
  }

  /**
   * 每帧推进（仅战斗未暂停时调用）。
   * 返回 'exited' 表示抵达哨站，调用方负责扣生命并移除。
   */
  updateEnemy(dtMs: number): EnemyUpdateResult {
    if (this.blockedBy && this.blockedBy.alive) {
      this.attackCd -= dtMs;
      if (this.attackCd <= 0) {
        this.attackCd = ENEMY_ATTACK_INTERVAL_MS;
        this.blockedBy.takeDamage(this.def.damage);
      }
      return 'alive';
    }
    this.blockedBy = null;

    this.dist += this.def.speed * (dtMs / 1000);
    if (this.dist >= this.path.length) return 'exited';

    const p = this.path.pointAt(this.dist, this.lateral);
    this.x = p.x;
    this.z = p.z;
    return 'alive';
  }

  /** 返回 true 表示被击败 */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }
}
