import Phaser from 'phaser';
import { ARCHER_TOWER } from '../data/towers';
import type { Enemy } from './Enemy';

/**
 * 弓箭塔：快速攻击射程内单个敌人（优先打走得最远的）。
 * 视觉三级升级：升级后外观明显变化（tower-archer-1/2/3）。
 */
export class ArcherTower extends Phaser.GameObjects.Container {
  level = 0;
  private cooldown = 0;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.sprite = scene.add.image(0, 0, 'tower-archer-1');
    this.add(this.sprite);
    scene.add.existing(this);
  }

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
    if (!this.canUpgrade) return;
    this.level += 1;
    this.sprite.setTexture(`tower-archer-${this.level + 1}`);
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1.25, to: 1 },
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 索敌并开火。返回本次命中的目标与伤害（由场景做投射物表现），
   * 未开火返回 null。
   */
  updateTower(dtMs: number, enemies: Enemy[]): { target: Enemy; damage: number } | null {
    this.cooldown -= dtMs;
    if (this.cooldown > 0) return null;

    let best: Enemy | null = null;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= this.stats.range && (!best || e.dist > best.dist)) best = e;
    }
    if (!best) return null;

    this.cooldown = this.stats.fireIntervalMs;
    return { target: best, damage: this.stats.damage };
  }
}
