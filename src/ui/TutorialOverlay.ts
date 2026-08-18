import Phaser from 'phaser';

const STORAGE_KEY = 'vorush.tutorial.done';

/**
 * 首次教学引导：高亮圈 + 提示文字，每次只教一个操作。
 * 重玩不重复强制教学（localStorage 记录，失败时降级为每局只教一次）。
 */
export class TutorialOverlay {
  private container: Phaser.GameObjects.Container;
  private shown = false;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
  }

  static shouldShow(): boolean {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  }

  static markDone(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, '1');
    } catch {
      // 降级：本局内仍受 shown 标记保护
    }
  }

  /** 在 (x, y) 处显示高亮圈与提示文字 */
  pointTo(x: number, y: number, text: string): void {
    this.container.removeAll(true);
    const ring = this.scene.add.circle(x, y, 56).setStrokeStyle(5, 0xf1c40f);
    // 提示文字限制在屏幕内，避免边缘目标裁剪
    const labelX = Phaser.Math.Clamp(x, 220, 1060);
    const labelY = y - 90 < 60 ? y + 110 : y - 90;
    const label = this.scene.add
      .text(labelX, labelY, text, {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5);
    this.container.add([ring, label]);
    this.container.setVisible(true);
    this.scene.tweens.killTweensOf(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 1.15 },
      alpha: { from: 1, to: 0.5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.shown = true;
  }

  clear(): void {
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  /** 完成全部教学步骤后调用：本局 + 永久不再显示 */
  finish(): void {
    this.clear();
    TutorialOverlay.markDone();
  }
}
