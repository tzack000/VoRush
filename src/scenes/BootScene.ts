import Phaser from 'phaser';
import { LEVEL_WORDS } from '../data/words';

/**
 * BootScene：程序生成全部占位贴图（明亮卡通风格，无外部素材依赖），
 * 加载单词发音音频，随后进入 LevelScene。数值配置均为 TS 模块直接 import。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const w of LEVEL_WORDS) {
      this.load.audio(w.audioKey, `assets/audio/words/${w.id}.m4a`);
    }
  }

  create(): void {
    this.scale.lockOrientation('landscape');
    const g = this.add.graphics();

    // 草地地块 64x64
    g.fillStyle(0x86c96f).fillRect(0, 0, 64, 64);
    g.fillStyle(0x79bd62);
    for (let i = 0; i < 8; i++) {
      g.fillRect(Phaser.Math.Between(0, 56), Phaser.Math.Between(0, 56), 6, 6);
    }
    g.generateTexture('tile-grass', 64, 64);
    g.clear();

    // 路径地块 64x64
    g.fillStyle(0xd9b77c).fillRect(0, 0, 64, 64);
    g.fillStyle(0xcfa96c);
    for (let i = 0; i < 6; i++) {
      g.fillCircle(Phaser.Math.Between(4, 60), Phaser.Math.Between(4, 60), 3);
    }
    g.generateTexture('tile-path', 64, 64);
    g.clear();

    // 塔位光圈 80x80
    g.lineStyle(4, 0xffffff, 0.9).strokeCircle(40, 40, 34);
    g.fillStyle(0xffffff, 0.15).fillCircle(40, 40, 34);
    g.generateTexture('spot', 80, 80);
    g.clear();

    // 弓箭塔三级（外观逐级明显变化）
    const archerRoof = [0x3d9970, 0x2ecc71, 0xf1c40f];
    for (let lv = 0; lv < 3; lv++) {
      g.fillStyle(0x8b5a2b).fillRect(12, 24, 40, 40); // 塔身
      g.fillStyle(archerRoof[lv]).fillTriangle(8, 26, 56, 26, 32, 2); // 屋顶
      g.fillStyle(0x5d3a1a).fillRect(28, 44, 8, 20); // 门
      if (lv >= 1) g.fillStyle(0xffffff).fillRect(18, 30, 8, 8); // 窗
      if (lv >= 2) g.fillStyle(0xf1c40f).fillCircle(32, 14, 5); // 金顶珠
      g.generateTexture(`tower-archer-${lv + 1}`, 64, 64);
      g.clear();
    }

    // 骑士营地三级
    const tentColors = [0x95a5a6, 0x3498db, 0x9b59b6];
    for (let lv = 0; lv < 3; lv++) {
      g.fillStyle(0x7f8c8d).fillRect(8, 40, 48, 24); // 围栏
      g.fillStyle(tentColors[lv]).fillTriangle(14, 42, 50, 42, 32, 10); // 帐篷
      g.fillStyle(0x2c3e50).fillRect(28, 30, 8, 12); // 帐门
      if (lv >= 1) g.fillStyle(0xe74c3c).fillTriangle(32, 10, 32, 2, 44, 6); // 旗帜
      if (lv >= 2) g.lineStyle(3, 0xf1c40f).strokeRect(10, 42, 44, 20); // 金边
      g.generateTexture(`tower-knight-${lv + 1}`, 64, 64);
      g.clear();
    }

    // 敌人：哥布林（绿）、野狼（灰）、哥布林队长（大、深绿、角）
    this.makeFace(g, 'enemy-goblin', 0x58b368, 22);
    this.makeFace(g, 'enemy-wolf', 0x9aa5b1, 20);
    g.fillStyle(0x3d8b4f).fillCircle(30, 30, 28);
    g.fillStyle(0x2f6e3d).fillTriangle(14, 14, 22, 4, 26, 16);
    g.fillTriangle(46, 14, 38, 4, 34, 16);
    g.fillStyle(0xffffff).fillCircle(22, 26, 5).fillCircle(38, 26, 5);
    g.fillStyle(0x1b1b1b).fillCircle(22, 26, 2).fillCircle(38, 26, 2);
    g.generateTexture('enemy-captain', 60, 60);
    g.clear();

    // 骑士（蓝色圆 + 头盔）
    g.fillStyle(0x3498db).fillCircle(20, 20, 18);
    g.fillStyle(0xbdc3c7).fillRect(6, 6, 28, 8);
    g.fillStyle(0xffffff).fillCircle(14, 20, 4).fillCircle(26, 20, 4);
    g.fillStyle(0x1b1b1b).fillCircle(14, 20, 2).fillCircle(26, 20, 2);
    g.generateTexture('knight', 40, 40);
    g.clear();

    // 箭矢 20x6
    g.fillStyle(0x8b5a2b).fillRect(0, 2, 16, 2);
    g.fillStyle(0xcccccc).fillTriangle(16, 0, 16, 6, 20, 3);
    g.generateTexture('arrow', 20, 6);
    g.clear();

    // 补给箱 56x56
    g.fillStyle(0xa0522d).fillRect(4, 8, 48, 44);
    g.fillStyle(0xd2691e).fillRect(4, 8, 48, 10);
    g.lineStyle(4, 0xf1c40f).strokeRect(4, 8, 48, 44);
    g.fillStyle(0xf1c40f).fillCircle(28, 30, 6);
    g.generateTexture('crate', 56, 56);
    g.clear();

    g.destroy();
    this.scene.start('Level');
  }

  private makeFace(
    g: Phaser.GameObjects.Graphics,
    key: string,
    color: number,
    radius: number,
  ): void {
    g.fillStyle(color).fillCircle(25, 25, radius);
    g.fillStyle(0xffffff).fillCircle(17, 21, 5).fillCircle(33, 21, 5);
    g.fillStyle(0x1b1b1b).fillCircle(17, 21, 2).fillCircle(33, 21, 2);
    g.generateTexture(key, 50, 50);
    g.clear();
  }
}
