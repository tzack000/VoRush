import { PATH_POINTS } from '../data/level';
import { WordAudio } from '../quiz/WordAudio';
import { el } from '../ui/dom';
import { toWorld } from '../world/coords';
import { IslandScene } from '../world/IslandScene';
import { RaycastPicker } from '../world/RaycastPicker';
import { LevelController } from './LevelController';

/** Game：组装渲染层（IslandScene）、拾取层（RaycastPicker）与单局编排（LevelController）。 */
export class Game {
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
    let controller: LevelController;
    const picker = new RaycastPicker(island.camera, island.renderer.domElement, (id) =>
      controller.onPick(id),
    );
    controller = new LevelController(island, picker, uiRoot);

    // 调试面板（?debug=1）：FPS + 单局计时，供真机走查读数
    if (new URLSearchParams(location.search).get('debug') === '1') {
      this.setupDebugHud(island, uiRoot);
    }

    island.start();
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
