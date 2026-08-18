import Phaser from 'phaser';
import type { EnemyDef } from '../data/waves';

/** 骑士等拦截者的最小接口（避免循环依赖） */
export interface Blocker {
  readonly alive: boolean;
  takeDamage(amount: number): void;
}

export type EnemyUpdateResult = 'alive' | 'exited';

const ENEMY_ATTACK_INTERVAL_MS = 1000;

export class Enemy extends Phaser.GameObjects.Container {
  hp: number;
  readonly maxHp: number;
  readonly def: EnemyDef;
  /** 已沿路径行进的距离（像素） */
  dist = 0;
  blockedBy: Blocker | null = null;
  private attackCd = 0;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpBarWidth = 40;

  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number) {
    super(scene, x, y);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;

    const body = scene.add.image(0, 0, def.textureKey);
    this.hpBarBg = scene.add
      .rectangle(0, -36, this.hpBarWidth, 6, 0x000000, 0.5)
      .setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(-this.hpBarWidth / 2, -36, this.hpBarWidth, 6, 0x2ecc71)
      .setOrigin(0, 0.5);
    this.add([body, this.hpBarBg, this.hpBar]);
    scene.add.existing(this);
  }

  /**
   * 每帧推进（仅战斗未暂停时调用）。
   * 返回 'exited' 表示到达出口，调用方负责扣生命并移除。
   */
  updateEnemy(
    dtMs: number,
    path: Phaser.Curves.Path,
    pathLength: number,
  ): EnemyUpdateResult {
    if (this.blockedBy && this.blockedBy.alive) {
      // 被骑士拦截：停下交战
      this.attackCd -= dtMs;
      if (this.attackCd <= 0) {
        this.attackCd = ENEMY_ATTACK_INTERVAL_MS;
        this.blockedBy.takeDamage(this.def.damage);
      }
      return 'alive';
    }
    this.blockedBy = null;

    this.dist += this.def.speed * (dtMs / 1000);
    if (this.dist >= pathLength) return 'exited';

    const p = path.getPoint(this.dist / pathLength);
    this.setPosition(p.x, p.y);
    return 'alive';
  }

  /** 返回 true 表示被击败 */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.width = this.hpBarWidth * ratio;
    this.hpBar.fillColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c;
    return this.hp <= 0;
  }
}
