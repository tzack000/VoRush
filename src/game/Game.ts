import { unlockAudio } from '../audio/sfx';
import { PATH_POINTS } from '../data/level';
import type { WordPack } from '../data/words';
import { WordAudio } from '../quiz/WordAudio';
import { el, makeButton } from '../ui/dom';
import { PackSelectView } from '../ui/PackSelectView';
import { toWorld } from '../world/coords';
import { IslandScene } from '../world/IslandScene';
import { RaycastPicker } from '../world/RaycastPicker';
import { LevelController } from './LevelController';

/**
 * Game：组装渲染层、拾取层与流程编排。
 * 流程：开始界面（解锁音频）→ 词包选择 → LevelController(pack)
 * → 结算后重玩本包或返回词包选择。
 */
export class Game {
  private controller: LevelController | null = null;
  private packSelect: PackSelectView;

  constructor(container: HTMLElement) {
    // DOM UI 覆盖层
    const uiRoot = el('div', { id: 'ui' });
    container.append(uiRoot);
    container.append(el('div', { id: 'rotate-tip', text: '请旋转设备，横屏游玩 🔄' }));

    // 3D 场景（路径映射为世界坐标供地形着色）
    const pathWorld = PATH_POINTS.map(([x, y]) => toWorld(x, y));
    const island = new IslandScene(container, pathWorld);

    // 音频预载
    WordAudio.init();

    // 拾取 → 控制器
    const picker = new RaycastPicker(island.camera, island.renderer.domElement, (id) =>
      this.controller?.onPick(id),
    );

    this.packSelect = new PackSelectView(uiRoot, (pack) => {
      this.packSelect.hide();
      this.startLevel(island, picker, uiRoot, pack);
    });

    this.showStartOverlay(uiRoot, () => this.packSelect.show());

    // 调试面板（?debug=1）：FPS + 单局计时，供真机走查读数
    if (new URLSearchParams(location.search).get('debug') === '1') {
      this.setupDebugHud(island, uiRoot);
    }

    island.start();
  }

  private showStartOverlay(uiRoot: HTMLElement, onStart: () => void): void {
    const start = makeButton({
      label: '开始 ▶',
      className: 'btn-green',
      onClick: () => {
        // 首次用户手势内解锁音频（iOS 限制）
        unlockAudio();
        WordAudio.unlock();
        dim.remove();
        onStart();
      },
    });
    const dim = el('div', { className: 'modal-dim' }, [
      el('div', { className: 'modal-panel' }, [
        el('div', { className: 'modal-title', text: 'VoRush' }),
        el('div', { text: '英语单词塔防' }),
        start,
      ]),
    ]);
    uiRoot.append(dim);
  }

  private startLevel(
    island: IslandScene,
    picker: RaycastPicker,
    uiRoot: HTMLElement,
    pack: WordPack,
  ): void {
    this.controller?.dispose();
    this.controller = new LevelController(island, picker, uiRoot, pack, {
      onReplay: () => this.startLevel(island, picker, uiRoot, pack),
      onExit: () => {
        this.controller?.dispose();
        this.controller = null;
        this.packSelect.show();
      },
    });
    this.controller.begin();
  }

  private setupDebugHud(island: IslandScene, uiRoot: HTMLElement): void {
    const hud = el('div', { id: 'debug-hud', text: 'FPS --' });
    uiRoot.append(hud);

    let sessionStart: number | null = null;
    let sessionEnd: number | null = null;
    window.addEventListener('vorush-session-start', () => {
      sessionStart = performance.now();
      sessionEnd = null;
    });
    window.addEventListener('vorush-session-end', () => {
      sessionEnd = performance.now();
    });

    let acc = 0;
    let frames = 0;
    let fps = 0;
    island.onFrame((dtMs) => {
      acc += dtMs;
      frames += 1;
      if (acc >= 500) {
        fps = Math.round((frames * 1000) / acc);
        acc = 0;
        frames = 0;
        let text = `FPS ${fps}`;
        if (sessionStart !== null) {
          const end = sessionEnd ?? performance.now();
          const sec = Math.round((end - sessionStart) / 1000);
          text += `\n单局 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}${sessionEnd ? ' (完)' : ''}`;
        }
        hud.textContent = text;
      }
    });
  }
}
