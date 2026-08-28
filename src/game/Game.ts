import { unlockAudio } from '../audio/sfx';
import { PATH_POINTS, TOWER_SPOTS } from '../data/level';
import { LEVELS, type LevelDef } from '../data/levels';
import { clearedLevelIds, readClear, starCount } from '../data/progress';
import { buildMapLayout, newlyUnlocked, nodeState } from '../data/mapLayout';
import { WordAudio } from '../quiz/WordAudio';
import { el, makeButton } from '../ui/dom';
import type { MapNodeStatus } from '../ui/WorldMapView';
import { WorldMapView } from '../ui/WorldMapView';
import { toWorld, islandHeight } from '../world/coords';
import { IslandScene } from '../world/IslandScene';
import { RaycastPicker } from '../world/RaycastPicker';
import { WorldMap } from '../world/WorldMap';
import { Tweens } from '../world/Tween';
import { Vector3 } from 'three';
import { LevelController } from './LevelController';

/**
 * Game：组装渲染层、拾取层与流程编排。
 * 流程：开始界面（解锁音频）→ 3D 大地图 → LevelController(level)
 * → 结算后重玩本关或返回大地图（新解锁则播放解锁动画）。
 */
export class Game {
  private controller: LevelController | null = null;
  private map: WorldMap;
  private mapView: WorldMapView;
  private layout = buildMapLayout();
  /** 进入单局前的通关集合，用于结算回来时判断新解锁 */
  private clearedBefore: ReadonlySet<string> = new Set();
  private pendingUnlock: number | null = null;

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

    // 拾取 → 控制器（地图模式下停用，地图自带点击处理）
    const picker = new RaycastPicker(island.camera, island.renderer.domElement, (id) =>
      this.controller?.onPick(id),
    );

    this.mapView = new WorldMapView(uiRoot, (level) => this.startLevel(island, picker, uiRoot, level));
    this.map = new WorldMap(island, island.renderer.domElement, this.layout, (index) =>
      this.onTapNode(index),
    );

    // 测试辅助：暴露塔位屏幕坐标（自动化冒烟用）
    (window as unknown as Record<string, unknown>).__vorush = {
      spotScreenPos: (index: number) => {
        const [x2d, y2d] = TOWER_SPOTS[index];
        const { x, z } = toWorld(x2d, y2d);
        const world = new Vector3(x, islandHeight(x, z), z);
        return island.projectToScreen(world);
      },
      mapLevels: () =>
        this.layout.nodes.map((n) => ({ index: n.index, packId: n.packId, x: n.x, z: n.z })),
      mapCamera: () => ({ x: this.map.targetX, z: this.map.targetZ, zoom: this.map.zoomLevel }),
    };

    this.showStartOverlay(uiRoot, () => this.enterMap(true));

    // 调试面板（?debug=1）：FPS + 单局计时，供真机走查读数
    if (new URLSearchParams(location.search).get('debug') === '1') {
      this.setupDebugHud(island, uiRoot);
    }

    island.start();
    // 地图标签每帧跟随岛屿屏幕坐标
    island.onFrame(() => {
      this.mapView.updateLabels(this.map.anchors());
    });
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

  // ---------- 大地图 ----------

  /**
   * 进入大地图；focus=true 时把相机取景到"现在能玩的全部关卡"，
   * 让玩家直接看到每一个已解锁的岛屿并任选一个开始。
   */
  private enterMap(focus: boolean): void {
    this.controller?.dispose();
    this.controller = null;
    const cleared = clearedLevelIds();
    this.mapView.mount();
    this.map.show(cleared);
    if (focus) this.map.frameProgress(cleared, false);
    this.refreshLabels(cleared);
    // 结算遮罩可能仍开着，保险起见关掉
    if (this.pendingUnlock !== null) {
      const index = this.pendingUnlock;
      this.pendingUnlock = null;
      this.map.playUnlock(index);
      this.mapView.popStars(index - 1);
      this.mapView.toast('新关卡解锁！');
    }
  }

  private refreshLabels(cleared: ReadonlySet<string>): void {
    const statuses: MapNodeStatus[] = this.layout.nodes.map((node) => ({
      index: node.index,
      state: nodeState(this.layout.nodes, node.index, cleared),
      stars: starCount(readClear(node.levelId)),
    }));
    this.mapView.refreshStates(statuses);
  }

  private onTapNode(index: number): void {
    const levelDef = this.levelDef(index);
    const cleared = clearedLevelIds();
    const state = nodeState(this.layout.nodes, index, cleared);
    if (state === 'locked') {
      this.map.shakeLock(index);
      this.mapView.toast(`先通过第 ${index - 1} 关吧！`);
    } else {
      this.map.bounce(index, 0.35, 320);
    }
    this.mapView.showCard(levelDef, state, starCount(readClear(levelDef.id)));
  }

  /** 地图节点序号 → 关卡定义（词包与难度缩放都在里面） */
  private levelDef(index: number): LevelDef {
    const level = LEVELS[index - 1];
    if (!level) throw new Error(`unknown level: ${index}`);
    return level;
  }

  // ---------- 单局 ----------

  private startLevel(
    island: IslandScene,
    picker: RaycastPicker,
    uiRoot: HTMLElement,
    level: LevelDef,
  ): void {
    this.clearedBefore = clearedLevelIds();
    this.mapView.hideCard();
    this.map.hide();
    this.mapView.destroy();
    picker.enabled = true;
    picker.clear();
    Tweens.killAll();
    island.setView(null, null);
    this.controller?.dispose();
    this.controller = new LevelController(island, picker, uiRoot, level, {
      onReplay: () => this.startLevel(island, picker, uiRoot, level),
      onExit: () => this.onLevelExit(level),
    });
    this.controller.begin();
  }

  private onLevelExit(level: LevelDef): void {
    const after = clearedLevelIds();
    const justCleared = after.has(level.id) && !this.clearedBefore.has(level.id);
    const unlocked = justCleared ? newlyUnlocked(this.layout.nodes, this.clearedBefore, after) : [];
    this.pendingUnlock = unlocked.length > 0 ? unlocked[0] : null;
    this.controller?.dispose();
    this.controller = null;
    this.enterMap(false);
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
