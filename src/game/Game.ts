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

    island.start();
  }
}
