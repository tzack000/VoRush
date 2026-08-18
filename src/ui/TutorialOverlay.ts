import { el } from './dom';

const STORAGE_KEY = 'vorush.tutorial.done';

/**
 * 首次教学引导（DOM）：高亮圈 + 提示文字，每次只教一个操作。
 * 坐标为屏幕像素；3D 世界目标由控制器投影后传入。
 */
export class TutorialOverlay {
  private ring: HTMLElement | null = null;
  private label: HTMLElement | null = null;

  constructor(private uiRoot: HTMLElement) {}

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
      // 降级：仅本局有效
    }
  }

  /** 在屏幕 (x, y) 处显示高亮圈与提示文字 */
  pointTo(x: number, y: number, text: string): void {
    this.clear();
    this.ring = el('div', { id: 'tutorial-ring' });
    this.ring.style.left = `${x}px`;
    this.ring.style.top = `${y}px`;

    this.label = el('div', { id: 'tutorial-label', text });
    // 提示文字限制在屏幕内，避免边缘目标裁剪
    const labelX = Math.min(Math.max(x, 200), window.innerWidth - 200);
    const labelY = y - 110 < 20 ? y + 110 : y - 110;
    this.label.style.left = `${labelX}px`;
    this.label.style.top = `${labelY}px`;

    this.uiRoot.append(this.ring, this.label);
  }

  /** 高亮一个 DOM 元素（按钮等） */
  pointToElement(target: HTMLElement, text: string): void {
    const rect = target.getBoundingClientRect();
    this.pointTo(rect.left + rect.width / 2, rect.top + rect.height / 2, text);
  }

  clear(): void {
    this.ring?.remove();
    this.label?.remove();
    this.ring = null;
    this.label = null;
  }

  finish(): void {
    this.clear();
    TutorialOverlay.markDone();
  }
}
