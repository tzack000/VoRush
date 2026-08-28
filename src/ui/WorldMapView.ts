import { LEVELS, type LevelDef } from '../data/levels';
import { getPack } from '../data/words';
import type { NodeAnchor } from '../world/WorldMap';
import type { NodeState } from '../data/mapLayout';
import { el, makeButton } from './dom';

export interface MapNodeStatus {
  index: number;
  state: NodeState;
  /** 已获得星星数 0~3 */
  stars: number;
}

interface LabelEntry {
  root: HTMLElement;
  name: HTMLElement;
  stars: HTMLElement;
}

/**
 * WorldMapView：大地图的 DOM 层——3D 锚定的关卡标签、KR 式关卡信息卡与提示条。
 * 标签不吃指针事件（地图拖拽/点击在 canvas 上），只有卡片与按钮可点。
 */
export class WorldMapView {
  private root: HTMLElement | null = null;
  private labelLayer: HTMLElement | null = null;
  private card: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;
  private toastTimer = 0;
  private labels = new Map<number, LabelEntry>();

  constructor(
    private uiRoot: HTMLElement,
    private onStart: (level: LevelDef) => void,
  ) {}

  mount(): void {
    this.destroy();
    const labelLayer = el('div', { className: 'map-label-layer' });
    this.labelLayer = labelLayer;
    for (const level of LEVELS) {
      const name = el('div', { className: 'map-node-name' });
      const stars = el('div', { className: 'map-node-stars' });
      const label = el('div', { className: 'map-node-label' }, [name, stars]);
      labelLayer.append(label);
      this.labels.set(level.index, { root: label, name, stars });
    }
    const root = el('div', { id: 'map-ui' }, [
      el('div', { className: 'map-header', text: '选择关卡 🗺️' }),
      labelLayer,
    ]);
    this.root = root;
    this.uiRoot.append(root);
  }

  destroy(): void {
    this.hideCard();
    this.root?.remove();
    this.root = null;
    this.labelLayer = null;
    this.labels.clear();
  }

  /** 刷新每个节点标签的文字与星级/锁定态 */
  refreshStates(statuses: MapNodeStatus[]): void {
    for (const s of statuses) {
      const label = this.labels.get(s.index);
      const level = LEVELS[s.index - 1];
      if (!label || !level) continue;
      const pack = getPack(level.packId);
      label.name.textContent = `${s.index}. ${pack.name}`;
      label.root.classList.toggle('locked', s.state === 'locked');
      label.root.classList.toggle('current', s.state === 'current');
      if (s.state === 'locked') {
        label.stars.textContent = '🔒';
      } else {
        label.stars.textContent = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
      }
    }
  }

  /** 点亮星星时的弹跳反馈 */
  popStars(index: number): void {
    const label = this.labels.get(index);
    if (!label) return;
    label.stars.classList.remove('pop');
    // 强制重排以便重复播放动画
    void label.stars.offsetWidth;
    label.stars.classList.add('pop');
  }

  /** 每帧把标签定位到岛屿的屏幕坐标 */
  updateLabels(anchors: NodeAnchor[]): void {
    if (!this.labelLayer) return;
    for (const a of anchors) {
      const label = this.labels.get(a.index);
      if (!label) continue;
      label.root.style.transform = `translate(${Math.round(a.x)}px, ${Math.round(a.y)}px) translate(-50%, -130%)`;
      label.root.style.opacity = a.visible ? '1' : '0';
    }
  }

  /** KR 式关卡信息卡：确认后才进入关卡 */
  showCard(level: LevelDef, state: NodeState, stars: number): void {
    this.hideCard();
    const pack = getPack(level.packId);
    const locked = state === 'locked';
    const difficulty = Math.min(3, Math.ceil(level.index / 3));

    const rows = [
      el('div', { className: 'map-card-row' }, [
        el('span', { text: '要学的词' }),
        el('span', { className: 'map-card-value', text: `${pack.emoji} ${pack.name}` }),
      ]),
      el('div', { className: 'map-card-row' }, [
        el('span', { text: '难度' }),
        el('span', { className: 'map-card-value', text: '💪'.repeat(difficulty) }),
      ]),
      el('div', { className: 'map-card-row' }, [
        el('span', { text: '已得星星' }),
        el('span', {
          className: 'map-card-value',
          text: locked ? '—' : '★'.repeat(stars) + '☆'.repeat(3 - stars),
        }),
      ]),
    ];

    const actions = locked
      ? [makeButton({ label: '知道啦', onClick: () => this.hideCard() })]
      : [
          makeButton({
            label: '开始 ▶',
            className: 'btn-green',
            onClick: () => {
              this.hideCard();
              this.onStart(level);
            },
          }),
          makeButton({ label: '关闭', onClick: () => this.hideCard() }),
        ];

    const card = el('div', { className: 'map-card' }, [
      el('div', { className: 'map-card-title', text: locked ? '🔒 还没解锁' : `第 ${level.index} 关` }),
      el('div', { className: 'map-card-emoji', text: locked ? '🔒' : pack.emoji }),
      ...rows,
      locked
        ? el('div', { className: 'map-card-hint', text: `先通过第 ${level.index - 1} 关吧！` })
        : el('div', { className: 'map-card-hint', text: '守好关卡，学会这一关的单词' }),
      el('div', { className: 'map-card-actions' }, actions),
    ]);

    const backdrop = el('div', { className: 'map-card-backdrop' }, [card]);
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) this.hideCard();
    });
    this.card = backdrop;
    this.uiRoot.append(backdrop);
  }

  hideCard(): void {
    this.card?.remove();
    this.card = null;
  }

  toast(text: string): void {
    this.toastEl?.remove();
    const t = el('div', { className: 'map-toast', text });
    this.toastEl = t;
    this.uiRoot.append(t);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      t.remove();
      if (this.toastEl === t) this.toastEl = null;
    }, 1800);
  }
}
