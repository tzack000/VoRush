import type { StarResult } from '../learning/StarRating';
import { el, makeButton } from './dom';

/** 三星结算 / 失败结算面板（DOM 模态）。 */
export class StarResultView {
  constructor(private uiRoot: HTMLElement) {}

  showVictory(stars: StarResult, onReplay: () => void, onExit: () => void): void {
    const rows: Array<[boolean, string]> = [
      [stars.clear, '通关星：守住了关卡'],
      [stars.know, '认识星：新词都答对过'],
      [stars.review, '复习星：新词记得牢'],
    ];
    const panel = el('div', { className: 'modal-panel' }, [
      el('div', { className: 'modal-title', text: '守住了草原哨站！' }),
      ...rows.map(([earned, label]) =>
        el('div', { className: `star-row ${earned ? 'earned' : ''}` }, [
          el('span', { className: 'star', text: earned ? '★' : '☆' }),
          el('span', { text: label }),
        ]),
      ),
      el('div', { className: 'result-buttons' }, [
        makeButton({ label: '再玩一次', className: 'btn-green', onClick: onReplay }),
        makeButton({ label: '选词包', onClick: onExit }),
      ]),
    ]);
    this.uiRoot.append(el('div', { className: 'modal-dim' }, [panel]));
  }

  showFail(onRetry: () => void, onExit: () => void): void {
    const panel = el('div', { className: 'modal-panel' }, [
      el('div', { className: 'modal-title', text: '怪物跑进去了几只' }),
      el('div', { text: '学过的单词都还在，再试一次吧！' }),
      el('div', { className: 'result-buttons' }, [
        makeButton({ label: '再试一次', className: 'btn-green', onClick: onRetry }),
        makeButton({ label: '选词包', onClick: onExit }),
      ]),
    ]);
    this.uiRoot.append(el('div', { className: 'modal-dim' }, [panel]));
  }
}
