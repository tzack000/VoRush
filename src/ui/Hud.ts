import Phaser from 'phaser';

/** 顶部 HUD：金币、出口生命、波次。 */
export class Hud extends Phaser.GameObjects.Container {
  private goldText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const bar = scene.add.rectangle(640, 28, 1280, 56, 0x000000, 0.35);
    this.goldText = this.makeText(scene, 30, '💰 0');
    this.livesText = this.makeText(scene, 300, '❤️ 0');
    this.waveText = this.makeText(scene, 560, '');
    this.add([bar, this.goldText, this.livesText, this.waveText]);
    this.setDepth(500);
    scene.add.existing(this);
  }

  private makeText(scene: Phaser.Scene, x: number, text: string): Phaser.GameObjects.Text {
    return scene.add
      .text(x, 28, text, { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
  }

  refresh(gold: number, lives: number, waveLabel: string): void {
    this.goldText.setText(`💰 ${gold}`);
    this.livesText.setText(`❤️ ${lives}`);
    this.waveText.setText(waveLabel);
  }
}
