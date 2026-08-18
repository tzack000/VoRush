import Phaser from 'phaser';

export interface ButtonOptions {
  width?: number;
  height?: number;
  label: string;
  fontSize?: number;
  bg?: number;
  bgDisabled?: number;
  textColor?: string;
}

/** 通用按钮：最小 60×60（儿童触控约束），pointerdown 触发。 */
export class Button extends Phaser.GameObjects.Container {
  private bgRect: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private enabled = true;
  private readonly bgColor: number;
  private readonly bgDisabledColor: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: ButtonOptions,
    onClick: () => void,
  ) {
    super(scene, x, y);
    const width = Math.max(opts.width ?? 160, 60);
    const height = Math.max(opts.height ?? 64, 60);
    this.bgColor = opts.bg ?? 0x4a90d9;
    this.bgDisabledColor = opts.bgDisabled ?? 0x95a5a6;

    this.bgRect = scene.add
      .rectangle(0, 0, width, height, this.bgColor)
      .setStrokeStyle(3, 0xffffff, 0.6);
    this.labelText = scene.add
      .text(0, 0, opts.label, {
        fontSize: `${opts.fontSize ?? 28}px`,
        color: opts.textColor ?? '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add([this.bgRect, this.labelText]);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (this.enabled) onClick();
    });
    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.bgRect.setFillStyle(enabled ? this.bgColor : this.bgDisabledColor);
    this.setAlpha(enabled ? 1 : 0.6);
    return this;
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }
}
