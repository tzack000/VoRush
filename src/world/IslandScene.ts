import * as THREE from 'three';
import { Tweens } from './Tween';
import { createIsland, createReflection, createWater, type PathWorld } from './terrain';
import { islandHeight, setIslandShape, type IslandShape } from './coords';
import { disposeObject } from './dispose';
import { makeBush, mulberry32 } from './models';

export type FrameCallback = (dtMs: number) => void;

/** 建地形所需的全部输入（由关卡地图数据换算而来） */
export interface TerrainSpec {
  levelIndex: number;
  shape: IslandShape;
  /** 每条入侵路径的世界坐标折线 */
  pathsWorld: Array<PathWorld>;
  spotsWorld: Array<{ x: number; z: number }>;
  bushSeed: number;
  bushCount: number;
}

function distToSeg(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

/**
 * IslandScene：renderer、柔和光照、固定斜俯视相机、渲染循环。
 * 世界内容（地形/实体）通过 scene 添加；每帧驱动注册的 FrameCallback。
 */
export class IslandScene {
  readonly renderer: THREE.WebGLRenderer;
  /** 战斗视图（LevelController 直接操作 scene） */
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private callbacks: FrameCallback[] = [];
  private clock = new THREE.Clock();
  private running = false;
  /** 全部相机（战斗 + 地图），resize 时统一更新 aspect */
  private views: THREE.PerspectiveCamera[] = [];
  /** 当前渲染视图，默认为战斗视图 */
  private view: { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null = null;
  /** 当前地形（换关时整体重建） */
  private terrain: {
    island: THREE.Mesh;
    reflection: THREE.Mesh;
    props: THREE.Object3D[];
    levelIndex: number;
  } | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#aec6c2'); // 灰蓝天水一色

    // 固定斜俯视相机（微缩模型观感，FOV 小 + 远距离）
    this.camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / container.clientHeight,
      0.1,
      300,
    );
    // 低角度斜俯视：露出悬崖立面与植被/塔的高度，强化 3D 微缩感
    this.camera.position.set(0, 30, 56);
    this.camera.lookAt(0, 2.4, -1);
    this.views.push(this.camera);

    // 柔和光照：灰调半球光 + 低强度暖色平行光（阴天的柔光），无阴影贴图
    const hemi = new THREE.HemisphereLight(0xd5dedd, 0xa8b39a, 1.1);
    const dir = new THREE.DirectionalLight(0xfff4e0, 0.85);
    dir.position.set(20, 30, 10);
    this.scene.add(hemi, dir);

    // 水面与光照与关卡无关，只建一次；地形由 buildTerrain 按关卡重建
    this.scene.add(createWater());

    window.addEventListener('resize', () => this.onResize(container));
  }

  // ---------- 地形（按关卡重建） ----------

  /**
   * 建/重建战斗地形。**必须在创建任何关卡实体之前调用**——
   * 实体的落地高度由 islandHeight 决定，而它读的是这里设置的岛屿形状。
   */
  buildTerrain(spec: TerrainSpec): void {
    this.clearTerrain();
    setIslandShape(spec.shape);

    const island = createIsland(spec.pathsWorld);
    const reflection = createReflection(island);
    this.scene.add(island, reflection);
    this.terrain = { island, reflection, props: [], levelIndex: spec.levelIndex };
    this.scatterBushes(spec);
  }

  private clearTerrain(): void {
    const t = this.terrain;
    if (!t) return;
    // 倒影复用 island.geometry：先移除并只释放它自己的材质，绝不能 dispose geometry
    this.scene.remove(t.reflection);
    (t.reflection.material as THREE.Material).dispose();
    this.scene.remove(t.island);
    disposeObject(t.island);
    for (const prop of t.props) {
      this.scene.remove(prop);
      disposeObject(prop);
    }
    this.terrain = null;
  }

  /** 在平台上散布球状灌木（避开路径与塔位，按关卡种子确定性生成） */
  private scatterBushes(spec: TerrainSpec): void {
    const rand = mulberry32(spec.bushSeed);
    let placed = 0;
    let guard = 0;
    while (placed < spec.bushCount && guard++ < spec.bushCount * 25) {
      const x = (rand() - 0.5) * 42;
      const z = (rand() - 0.5) * 22;
      const h = islandHeight(x, z);
      if (h < 3.2) continue; // 只放在平台上
      // 避开路径
      let minPath = Number.MAX_VALUE;
      for (const pathWorld of spec.pathsWorld) {
        for (let i = 0; i < pathWorld.length - 1; i++) {
          const a = pathWorld[i];
          const b = pathWorld[i + 1];
          minPath = Math.min(minPath, distToSeg(x, z, a.x, a.z, b.x, b.z));
        }
      }
      if (minPath < 2.4) continue;
      // 避开塔位
      if (spec.spotsWorld.some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;

      const bush = makeBush(placed * 7919 + 13);
      bush.scale.setScalar(1.5);
      bush.position.set(x, h - 0.1, z);
      this.scene.add(bush);
      this.terrain?.props.push(bush);
      placed += 1;
    }
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const cam of this.views) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h);
  }

  /** 登记额外相机（如地图相机），与战斗相机同步 aspect */
  registerCamera(camera: THREE.PerspectiveCamera): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    this.views.push(camera);
  }

  /** 切换渲染视图；传 null 回到战斗视图 */
  setView(scene: THREE.Scene | null, camera: THREE.PerspectiveCamera | null): void {
    this.view = scene && camera ? { scene, camera } : null;
  }

  get activeCamera(): THREE.PerspectiveCamera {
    return this.view?.camera ?? this.camera;
  }

  /** 注册每帧回调，返回取消注册的函数 */
  onFrame(cb: FrameCallback): () => void {
    this.callbacks.push(cb);
    return () => this.offFrame(cb);
  }

  offFrame(cb: FrameCallback): void {
    this.callbacks = this.callbacks.filter((c) => c !== cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const dtMs = Math.min(100, this.clock.getDelta() * 1000);
      Tweens.update(dtMs);
      for (const cb of this.callbacks) cb(dtMs);
      const view = this.view;
      if (view) this.renderer.render(view.scene, view.camera);
      else this.renderer.render(this.scene, this.camera);
    });
  }

  /** 世界坐标 → 屏幕像素（供 DOM 教学高亮/地图标签定位） */
  projectToScreen(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.activeCamera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }

  // ---------- 调试（?debug=1 / 自动化冒烟） ----------

  /** 建地形之前为 false；LevelController 构造时会断言，防止实体贴在上一关高度上 */
  get terrainReady(): boolean {
    return this.terrain !== null;
  }

  /** 冒烟用：确认换关时地形确实被替换、场景对象没有累积泄漏 */
  terrainDebug(): {
    levelIndex: number;
    geometryUuid: string;
    vertexCount: number;
    sceneChildren: number;
  } | null {
    if (!this.terrain) return null;
    const geo = this.terrain.island.geometry;
    return {
      levelIndex: this.terrain.levelIndex,
      geometryUuid: geo.uuid,
      vertexCount: geo.attributes.position.count,
      sceneChildren: this.scene.children.length,
    };
  }
}
