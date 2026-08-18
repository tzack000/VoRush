import {
  KNIGHT_CAMP,
  KNIGHT_ATTACK_INTERVAL_MS,
  KNIGHT_ENGAGE_RADIUS,
} from '../data/towers';
import type { Blocker, Enemy } from './Enemy';

/** 骑士（纯逻辑）：站位拦截、交战、撤退与复活。 */
export class KnightFighter implements Blocker {
  hp: number;
  alive = true;
  target: Enemy | null = null;
  private attackCd = 0;

  constructor(
    readonly x: number,
    readonly y: number,
    private readonly maxHpProvider: () => number,
  ) {
    this.hp = maxHpProvider();
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      if (this.target) {
        this.target.blockedBy = null;
        this.target = null;
      }
    }
  }

  revive(): void {
    this.hp = this.maxHpProvider();
    this.alive = true;
  }

  updateKnight(dtMs: number, enemies: Enemy[], damage: number): void {
    if (!this.alive) return;

    if (this.target && (!this.target.active || this.target.hp <= 0)) {
      this.target.blockedBy = null;
      this.target = null;
    }
    if (!this.target) {
      this.target =
        enemies.find(
          (e) =>
            e.active &&
            e.hp > 0 &&
            !e.blockedBy &&
            Math.hypot(this.x - e.x, this.y - e.z) <= KNIGHT_ENGAGE_RADIUS,
        ) ?? null;
      if (this.target) this.target.blockedBy = this;
    }
    if (!this.target) return;

    this.attackCd -= dtMs;
    if (this.attackCd <= 0) {
      this.attackCd = KNIGHT_ATTACK_INTERVAL_MS;
      this.target.takeDamage(damage);
    }
  }
}

/**
 * 骑士营地（纯逻辑）：派出骑士在路径拦截点阻挡敌人；
 * 骑士被击败后撤退，respawnMs 后返回。
 */
export class KnightCamp {
  readonly kind = 'knight' as const;
  level = 0;
  readonly fighter: KnightFighter;
  private respawnTimer = 0;

  constructor(
    readonly x: number,
    readonly y: number,
    rallyX: number,
    rallyY: number,
  ) {
    this.fighter = new KnightFighter(rallyX, rallyY, () => this.stats.knightHp);
  }

  get stats() {
    return KNIGHT_CAMP.levels[this.level];
  }

  get canUpgrade(): boolean {
    return this.stats.upgradeCost !== null;
  }

  get upgradeCost(): number | null {
    return this.stats.upgradeCost;
  }

  upgrade(): void {
    if (!this.canUpgrade) return;
    this.level += 1;
    if (this.fighter.alive) this.fighter.revive(); // 升级后骑士状态刷新
  }

  updateCamp(dtMs: number, enemies: Enemy[]): void {
    if (!this.fighter.alive) {
      // 骑士被击败后撤退，respawnMs 后返回
      if (this.respawnTimer <= 0) this.respawnTimer = this.stats.respawnMs;
      this.respawnTimer -= dtMs;
      if (this.respawnTimer <= 0) this.fighter.revive();
      return;
    }
    this.fighter.updateKnight(dtMs, enemies, this.stats.knightDamage);
  }
}
