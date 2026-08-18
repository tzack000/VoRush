import { el } from './dom';

/** 顶部 HUD：金币、出口生命、波次。 */
export class Hud {
  readonly root: HTMLElement;
  private goldSpan: HTMLElement;
  private livesSpan: HTMLElement;
  private waveSpan: HTMLElement;

  constructor(parent: HTMLElement) {
    this.goldSpan = el('span', { text: '💰 0' });
    this.livesSpan = el('span', { text: '❤️ 0' });
    this.waveSpan = el('span', { text: '' });
    this.root = el('div', { id: 'hud' }, [this.goldSpan, this.livesSpan, this.waveSpan]);
    parent.append(this.root);
  }

  refresh(gold: number, lives: number, waveLabel: string): void {
    this.goldSpan.textContent = `💰 ${gold}`;
    this.livesSpan.textContent = `❤️ ${lives}`;
    this.waveSpan.textContent = waveLabel;
  }
}
