import Phaser from 'phaser';
import {
  KNIGHT_CAMP,
  KNIGHT_ATTACK_INTERVAL_MS,
  KNIGHT_ENGAGE_RADIUS,
} from '../data/towers';
import type { Blocker, Enemy } from './Enemy';

class KnightFighter extends Phaser.GameObjects.Container implements Blocker {
  hp: number;
  alive = true;
  target: Enemy | null = null;
  private attackCd = 0;
  private hpBar: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly maxHpProvider: () => number,
  ) {
    super(scene, x, y);
    this.hp = maxHpProvider();
    this.add(scene.add.image(0, 0, 'knight'));
    this.hpBar = scene.add.rectangle(-16, -26, 32, 4, 0x3498db).setOrigin(0, 0.5);
    this.add(this.hpBar);
    scene.add.existing(this);
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    const max = this.maxHpProvider();
    this.hpBar.width = 32 * Phaser.Math.Clamp(this.hp / max, 0, 1);
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.alive = false;
    if (this.target) {
      this.target.blockedBy = null;
      this.target = null;
    }
    this.setVisible(false);
  }

  /** 复活并补满血 */
  revive(): void {
    this.hp = this.maxHpProvider();
    this.alive = true;
    this.hpBar.width = 32;
    this.setVisible(true);
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
            Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) <=
              KNIGHT_ENGAGE_RADIUS,
        ) ?? null;
      if (this.target) this.target.blockedBy = this;
    }
    if (!this.target) return;

    this.attackCd -= dtMs;
    if (this.attackCd <= 0) {
      this.attackCd = KNIGHT_ATTACK_INTERVAL_MS;
      // 伤害结算由场景统一处理（击杀动画/移除）
      this.target.takeDamage(damage);
    }
  }
}

/**
 * 骑士营地：派出骑士在路径拦截点阻挡敌人；
 * 骑士被击败后撤退，respawnMs 后返回。
 */
export class KnightCamp extends Phaser.GameObjects.Container {
  level = 0;
  private fighter: KnightFighter;
  private respawnTimer = 0;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, rallyX: number, rallyY: number) {
    super(scene, x, y);
    this.sprite = scene.add.image(0, 0, 'tower-knight-1');
    this.add(this.sprite);
    scene.add.existing(this);
    this.fighter = new KnightFighter(scene, rallyX, rallyY, () => this.stats.knightHp);
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
    this.sprite.setTexture(`tower-knight-${this.level + 1}`);
    if (this.fighter.alive) this.fighter.revive(); // 升级后骑士状态刷新
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1.25, to: 1 },
      duration: 250,
      ease: 'Back.easeOut',
    });
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
