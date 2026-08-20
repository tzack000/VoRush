import type { StarResult } from '../learning/StarRating';
import { getPack } from '../data/words';
import { LEVELS, isLevelUnlocked, type LevelDef } from '../data/levels';
import { el } from './dom';

function readStars(levelId: string): StarResult {
  try {
    const raw = globalThis.localStorage?.getItem(`vorush.clear.${levelId}`);
    if (raw) return JSON.parse(raw) as StarResult;
  } catch {
    // 忽略
  }
  return { clear: false, know: false, review: false };
}

function clearedLevelIds(): Set<string> {
  const ids = new Set<string>();
  for (const lv of LEVELS) {
    if (readStars(lv.id).clear) ids.add(lv.id);
  }
  return ids;
}

/** 关卡选择页：有序关卡网格（序号/emoji/名称/星星/锁定态），点击进入该关单局。 */
export class PackSelectView {
  private root: HTMLElement | null = null;

  constructor(
    private uiRoot: HTMLElement,
    private onSelect: (level: LevelDef) => void,
  ) {}

  show(): void {
    this.hide();
    const cleared = clearedLevelIds();
    const grid = el('div', { className: 'pack-grid' });
    for (const level of LEVELS) {
      const pack = getPack(level.packId);
      const stars = readStars(level.id);
      const starCount = [stars.clear, stars.know, stars.review].filter(Boolean).length;
      const unlocked = isLevelUnlocked(level.index, cleared);

      const card = el('div', { className: `pack-card ${unlocked ? '' : 'locked'}` }, [
        el('div', { className: 'pack-index', text: `第 ${level.index} 关` }),
        el('div', { className: 'pack-emoji', text: unlocked ? pack.emoji : '🔒' }),
        el('div', { className: 'pack-name', text: pack.name }),
        el('div', { className: 'pack-stars' }, [
          el('span', { text: '★'.repeat(starCount) }),
          el('span', { className: 'empty', text: '☆'.repeat(3 - starCount) }),
        ]),
      ]);
      if (unlocked) {
        card.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.onSelect(level);
        });
      }
      grid.append(card);
    }
    this.root = el('div', { className: 'pack-select' }, [
      el('div', { className: 'pack-title', text: '选择关卡 ⚔️' }),
      grid,
    ]);
    this.uiRoot.append(this.root);
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
  }
}
