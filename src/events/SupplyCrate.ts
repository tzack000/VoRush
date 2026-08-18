import Phaser from 'phaser';
import { CRATE_POSITIONS } from '../data/level';
import { sfx } from '../audio/sfx';

export interface SupplyCrateHooks {
  /** 玩家点击补给箱 */
  onTrigger: () => void;
}

const SPAWN_DELAY_MIN_MS = 6000;
const SPAWN_DELAY_MAX_MS = 12000;
const DESPAWN_MS = 20000;

/**
 * 补给箱：战斗中随机出现在战场旁，仅图标 + 提示音，不自动弹题；
 * 点击后由场景打开答题（并暂停战斗）；超时未点自动消失，无惩罚。
 * 每波至多一个（场景每波创建一次）。
 */
export class SupplyCrate {
  private spawnTimer: number;
  private lifeTimer = 0;
  private icon: Phaser.GameObjects.Container | null = null;
  private done = false;

  constructor(
    private scene: Phaser.Scene,
    private hooks: SupplyCrateHooks,
  ) {
    this.spawnTimer = Phaser.Math.Between(SPAWN_DELAY_MIN_MS, SPAWN_DELAY_MAX_MS);
  }

  /** 仅战斗未暂停时驱动 */
  update(dtMs: number): void {
    if (this.done) return;

    if (!this.icon) {
      this.spawnTimer -= dtMs;
      if (this.spawnTimer <= 0) this.spawn();
      return;
    }

    this.lifeTimer += dtMs;
    if (this.lifeTimer >= DESPAWN_MS) this.despawn(); // 忽略无惩罚
  }

  private spawn(): void {
    const [x, y] = Phaser.Utils.Array.GetRandom([...CRATE_POSITIONS]);
    const img = this.scene.add.image(0, 0, 'crate');
    const hint = this.scene.add
      .text(0, 44, '点我！', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.icon = this.scene.add.container(x, y, [img, hint]).setDepth(400);
    this.icon.setSize(80, 90);
    this.icon.setInteractive({ useHandCursor: true });
    this.icon.on('pointerdown', () => {
      if (this.done || !this.icon) return;
      this.done = true;
      this.icon.destroy();
      this.icon = null;
      this.hooks.onTrigger();
    });
    this.scene.tweens.add({
      targets: this.icon,
      y: y - 10,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    sfx.crate();
  }

  /** 自然消失（无惩罚） */
  private despawn(): void {
    this.done = true;
    if (this.icon) {
      this.scene.tweens.add({
        targets: this.icon,
        alpha: 0,
        duration: 300,
        onComplete: () => this.icon?.destroy(),
      });
      this.icon = null;
    }
  }

  /** 波次结束时强制清理 */
  destroy(): void {
    this.done = true;
    this.icon?.destroy();
    this.icon = null;
  }
}
