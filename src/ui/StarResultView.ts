import Phaser from 'phaser';
import type { StarResult } from '../learning/StarRating';
import { Button } from './Button';

/** 三星结算 / 失败结算面板。 */
export class StarResultView {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(1200);
  }

  showVictory(stars: StarResult, onReplay: () => void): void {
    const scene = this.container.scene;
    const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6);
    const panel = scene.add
      .rectangle(640, 360, 760, 480, 0xfff8e7)
      .setStrokeStyle(6, 0x8b5a2b);
    const title = scene.add
      .text(640, 180, '守住了草原哨站！', {
        fontSize: '42px',
        color: '#8b5a2b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rows: Array<[boolean, string]> = [
      [stars.clear, '通关星：守住了关卡'],
      [stars.know, '认识星：新词都答对过'],
      [stars.review, '复习星：新词记得牢'],
    ];
    const items = rows.map(([earned, label], i) => {
      const star = scene.add
        .text(420, 260 + i * 60, earned ? '★' : '☆', {
          fontSize: '44px',
          color: earned ? '#f1c40f' : '#bdc3c7',
        })
        .setOrigin(0.5);
      const text = scene.add.text(470, 260 + i * 60, label, {
        fontSize: '26px',
        color: earned ? '#2c3e50' : '#95a5a6',
      });
      return [star, text];
    });

    const replay = new Button(
      scene,
      640,
      520,
      { width: 240, height: 72, label: '再玩一次', fontSize: 30, bg: 0x27ae60 },
      onReplay,
    );

    this.container.add([dim, panel, title, ...items.flat(), replay]);
  }

  showFail(onRetry: () => void): void {
    const scene = this.container.scene;
    const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6);
    const panel = scene.add
      .rectangle(640, 360, 720, 380, 0xfff8e7)
      .setStrokeStyle(6, 0x8b5a2b);
    const title = scene.add
      .text(640, 260, '怪物跑进去了几只', {
        fontSize: '38px',
        color: '#8b5a2b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sub = scene.add
      .text(640, 330, '学过的单词都还在，再试一次吧！', {
        fontSize: '26px',
        color: '#555555',
      })
      .setOrigin(0.5);
    const retry = new Button(
      scene,
      640,
      440,
      { width: 240, height: 72, label: '再试一次', fontSize: 30, bg: 0x27ae60 },
      onRetry,
    );
    this.container.add([dim, panel, title, sub, retry]);
  }
}
