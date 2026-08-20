import type { StarResult } from '../learning/StarRating';
import { WORD_PACKS, type WordPack } from '../data/words';
import { el } from './dom';

function readStars(packId: string): StarResult {
  try {
    const raw = globalThis.localStorage?.getItem(`vorush.clear.${packId}`);
    if (raw) return JSON.parse(raw) as StarResult;
  } catch {
    // 忽略
  }
  return { clear: false, know: false, review: false };
}

/** 词包选择界面：网格卡片（emoji + 名称 + 星星），点击进入该包单局。 */
export class PackSelectView {
  private root: HTMLElement | null = null;

  constructor(
    private uiRoot: HTMLElement,
    private onSelect: (pack: WordPack) => void,
  ) {}

  show(): void {
    this.hide();
    const grid = el('div', { className: 'pack-grid' });
    for (const pack of WORD_PACKS) {
      const stars = readStars(pack.id);
      const starCount = [stars.clear, stars.know, stars.review].filter(Boolean).length;
      const card = el('div', { className: 'pack-card' }, [
        el('div', { className: 'pack-emoji', text: pack.emoji }),
        el('div', { className: 'pack-name', text: pack.name }),
        el('div', { className: 'pack-stars' }, [
          el('span', { text: '★'.repeat(starCount) }),
          el('span', { className: 'empty', text: '☆'.repeat(3 - starCount) }),
        ]),
      ]);
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onSelect(pack);
      });
      grid.append(card);
    }
    this.root = el('div', { className: 'pack-select' }, [
      el('div', { className: 'pack-title', text: '选择词包 📚' }),
      grid,
    ]);
    this.uiRoot.append(this.root);
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
  }
}
