import type { TowerDefBase } from '../data/towers';
import { el } from './dom';

export interface BuildPopupOptions {
  defs: TowerDefBase[];
  canAfford: (price: number) => boolean;
  /** 塔位锚点（屏幕像素） */
  anchor: { x: number; y: number };
  onBuild: (def: TowerDefBase) => void;
  onClose: () => void;
}

/**
 * 锚定式建塔菜单（Kingdom Rush 式）：弹出在塔位旁，
 * 展示塔型卡片（价格置灰），点击菜单外区域关闭。不暂停战斗。
 */
export class BuildPopup {
  private backdrop: HTMLElement | null = null;

  constructor(private uiRoot: HTMLElement) {}

  get isOpen(): boolean {
    return this.backdrop !== null;
  }

  open(opts: BuildPopupOptions): void {
    this.close();

    const panel = el('div', { className: 'build-popup' });
    for (const def of opts.defs) {
      const affordable = opts.canAfford(def.price);
      const card = el('div', { className: `tower-card ${affordable ? '' : 'disabled'}` }, [
        el('span', { className: 'card-emoji', text: def.emoji }),
        el('div', {}, [
          el('div', { className: 'card-name', text: def.name }),
          el('div', { className: 'card-hint', text: def.hint }),
          el('div', {
            className: `card-price ${affordable ? '' : 'cant-afford'}`,
            text: `💰 ${def.price}`,
          }),
        ]),
      ]);
      if (affordable) {
        card.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.close();
          opts.onBuild(def);
        });
      }
      panel.append(card);
    }

    // 锚定定位：水平居中于锚点，置于锚点上方，视口内防溢出
    const x = Math.min(Math.max(opts.anchor.x, 260), window.innerWidth - 260);
    const y = Math.max(opts.anchor.y - 200, 80);
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;

    // 全屏透明遮罩：点击菜单外区域关闭
    this.backdrop = el('div', { className: 'popup-backdrop' }, [panel]);
    this.backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === this.backdrop) {
        this.close();
        opts.onClose();
      }
    });
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.uiRoot.append(this.backdrop);
  }

  close(): void {
    this.backdrop?.remove();
    this.backdrop = null;
  }
}
