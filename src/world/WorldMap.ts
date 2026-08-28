import * as THREE from 'three';
import { Ease, Tweens } from './Tween';
import { createMapIsland, createMapReflection, createWater } from './terrain';
import { makeBanner, makeCurrentRing, makeLandmark, makeLock, makeSteppingStone } from './mapProps';
import {
  nodeState,
  unlockedFrameIndices,
  type MapLayout,
  type MapNode,
  type NodeState,
} from '../data/mapLayout';
import { clearedLevelIds } from '../data/progress';
import type { IslandScene } from './IslandScene';

export interface NodeAnchor {
  index: number;
  x: number;
  y: number;
  visible: boolean;
}

interface NodeView {
  node: MapNode;
  group: THREE.Group;
  island: THREE.Mesh;
  reflection: THREE.Mesh;
  landmark: THREE.Group | null;
  lock: THREE.Group | null;
  ring: THREE.Mesh | null;
  banner: THREE.Group | null;
  flagMesh: THREE.Mesh | null;
  state: NodeState;
  /** 灰度系数：1 全灰（未解锁），0 正常色 */
  grey: number;
  bob: number;
}

interface TrailView {
  from: number;
  to: number;
  stones: THREE.InstancedMesh;
  count: number;
  revealed: number;
}

const GREY = new THREE.Color('#8f968f');
const NORMAL = new THREE.Color('#ffffff');
const DRAG_THRESHOLD = 12;
/** 相机最多拉远到基准距离的几倍（画面塞不下全部已解锁关卡时的上限） */
const MAX_ZOOM = 2.8;

/**
 * WorldMap：Kingdom Rush 式 3D 大地图。
 * 自带 scene/camera（经 island.registerCamera 登记），通过 island.setView 切换渲染；
 * 拖拽平移、点击选岛（自带 raycast，战斗用 RaycastPicker 在地图模式下停用）。
 */
export class WorldMap {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private nodes: NodeView[] = [];
  private trails: TrailView[] = [];
  private target = new THREE.Vector2(0, 0);
  /** 相机拉远系数：1 为基准，取景需要时才放大 */
  private zoom = 1;
  private active = false;
  private time = 0;
  private pickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private drag = { active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0 };

  constructor(
    private island: IslandScene,
    private domElement: HTMLElement,
    private layout: MapLayout,
    private onTapNode: (index: number) => void,
  ) {
    this.scene.background = new THREE.Color('#aec6c2');
    this.scene.add(new THREE.HemisphereLight(0xd5dedd, 0xa8b39a, 1.15));
    const dir = new THREE.DirectionalLight(0xfff4e0, 0.85);
    dir.position.set(18, 30, 12);
    this.scene.add(dir);
    this.scene.add(createWater());

    this.camera = new THREE.PerspectiveCamera(layout.camera.fov, 1.6, 0.1, 400);
    island.registerCamera(this.camera);

    this.build();
    this.bindPointer();
    island.onFrame((dt) => this.update(dt));
  }

  // ---------- 构建 ----------

  private build(): void {
    for (const node of this.layout.nodes) {
      const group = new THREE.Group();
      group.position.set(node.x, 0, node.z);

      const island = createMapIsland(node.seed, node.radius);
      const reflection = createMapReflection(island);
      group.add(island, reflection);

      const view: NodeView = {
        node,
        group,
        island,
        reflection,
        landmark: null,
        lock: null,
        ring: null,
        banner: null,
        flagMesh: null,
        state: 'locked',
        grey: 1,
        bob: 0,
      };
      this.nodes.push(view);
      this.scene.add(group);
      this.pickables.push(island);
    }

    for (const trail of this.layout.trails) {
      const geo = new THREE.CylinderGeometry(0.42, 0.36, 0.16, 7);
      const stones = new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xcfc6ad, flatShading: true, roughness: 0.9 }),
        Math.max(1, trail.stones.length),
      );
      const m = new THREE.Matrix4();
      trail.stones.forEach((s, i) => {
        m.makeTranslation(s.x, 0, s.z);
        stones.setMatrixAt(i, m);
      });
      stones.instanceMatrix.needsUpdate = true;
      stones.count = 0;
      this.scene.add(stones);
      this.trails.push({ from: trail.from, to: trail.to, stones, count: trail.stones.length, revealed: 0 });
    }
  }

  private nodeView(index: number): NodeView | undefined {
    return this.nodes.find((n) => n.node.index === index);
  }

  // ---------- 显示 / 状态 ----------

  /** 进入地图：刷新各岛状态并把相机对准当前关 */
  show(cleared: ReadonlySet<string>): void {
    this.active = true;
    this.refresh(cleared);
    this.island.setView(this.scene, this.camera);
  }

  hide(): void {
    this.active = false;
    this.island.setView(null, null);
  }

  /** 按通关记录刷新岛屿三态（不播放动画） */
  refresh(cleared: ReadonlySet<string>): void {
    for (const view of this.nodes) {
      const state = nodeState(this.layout.nodes, view.node.index, cleared);
      this.applyState(view, state);
    }
    for (const trail of this.trails) {
      const target = this.nodeView(trail.to);
      const open = target !== undefined && target.state !== 'locked';
      this.setTrailRevealed(trail, open ? trail.count : 0);
    }
  }

  private applyState(view: NodeView, state: NodeState): void {
    view.state = state;
    // 地标：锁定岛留白（省绘制、读起来就是"还没开放"）
    if (state === 'locked') {
      view.landmark?.removeFromParent();
      view.landmark = null;
    } else if (!view.landmark) {
      const lm = makeLandmark(view.node.landmark, view.node.seed);
      lm.position.y = 1.1;
      view.landmark = lm;
      view.group.add(lm);
    }
    // 锁：仅锁定岛
    if (state === 'locked') {
      if (!view.lock) {
        const lock = makeLock(1.1);
        lock.position.y = 1.3;
        view.lock = lock;
        view.group.add(lock);
      }
    } else {
      view.lock?.removeFromParent();
      view.lock = null;
    }
    // 当前关光环
    if (state === 'current') {
      if (!view.ring) {
        const ring = makeCurrentRing(view.node.radius);
        ring.position.y = 1.35;
        view.ring = ring;
        view.group.add(ring);
      }
    } else {
      view.ring?.removeFromParent();
      view.ring = null;
    }
    // 通关旗
    if (state === 'cleared' && !view.banner) {
      const banner = makeBanner();
      banner.group.position.set(0, 1.1, 0);
      view.banner = banner.group;
      view.flagMesh = banner.flagMesh;
      view.group.add(banner.group);
    }

    this.setGrey(view, state === 'locked' ? 1 : 0);
  }

  private setGrey(view: NodeView, grey: number): void {
    view.grey = grey;
    const mat = view.island.material as THREE.MeshStandardMaterial;
    mat.color.copy(GREY).lerp(NORMAL, 1 - grey);
  }

  private setTrailRevealed(trail: TrailView, revealed: number): void {
    trail.revealed = Math.max(0, Math.min(trail.count, revealed));
    trail.stones.count = trail.revealed;
  }

  // ---------- 相机 ----------

  /** 调试用：当前取景状态（iPad 走查时读数） */
  get targetX(): number {
    return this.target.x;
  }
  get targetZ(): number {
    return this.target.y;
  }
  get zoomLevel(): number {
    return this.zoom;
  }

  private applyCamera(): void {
    this.placeCamera(this.target.x, this.target.y, this.zoom);
  }

  private placeCamera(x: number, z: number, zoom: number): void {
    const { height, distance, lookAtY } = this.layout.camera;
    this.camera.position.set(x, height * zoom, z + distance * zoom);
    this.camera.lookAt(x, lookAtY, z);
    this.camera.updateMatrixWorld(true);
  }

  /**
   * 取景到"玩家现在能玩的关卡"：全部已解锁关卡 + 下一个锁定关卡做诱饵。
   * 已解锁关卡永远在画面内，玩家可以直接点任意一个开始；进度越靠后相机越慢慢拉远。
   */
  frameProgress(cleared: ReadonlySet<string>, animate: boolean): void {
    const indices = unlockedFrameIndices(this.layout.nodes, cleared);
    const raw = this.fitView(indices);
    const fit = { ...raw, ...this.clampPoint(raw.x, raw.z) };
    if (animate) {
      const fromX = this.target.x;
      const fromZ = this.target.y;
      const fromZoom = this.zoom;
      Tweens.add({
        duration: 700,
        ease: Ease.inOutSine,
        onUpdate: (t) => {
          this.target.set(fromX + (fit.x - fromX) * t, fromZ + (fit.z - fromZ) * t);
          this.zoom = fromZoom + (fit.zoom - fromZoom) * t;
          this.applyCamera();
        },
      });
    } else {
      this.target.set(fit.x, fit.z);
      this.zoom = fit.zoom;
      this.applyCamera();
    }
  }

  /** 把取景点收进地图边界内（含一点余量），避免相机飘到空水域 */
  private clampPoint(x: number, z: number): { x: number; z: number } {
    const b = this.layout.bounds;
    return {
      x: Math.min(Math.max(x, b.minX - 8), b.maxX + 8),
      z: Math.min(Math.max(z, b.minZ - 8), b.maxZ + 8),
    };
  }

  /**
   * 求能框住这些节点的相机目标点与缩放。
   * 直接用投影试算，不依赖俯角三角公式——换 iPad 比例、改布局或改 fov 都不用重算常数。
   */
  private fitView(indices: number[]): { x: number; z: number; zoom: number } {
    const views = indices
      .map((i) => this.nodeView(i))
      .filter((v): v is NodeView => v !== null);
    if (views.length === 0) return { x: this.target.x, z: this.target.y, zoom: this.zoom };

    // 取样点：每座岛的东西南北四个边缘（地面高度）
    const probes: Array<{ x: number; z: number }> = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for (const v of views) {
      const r = v.node.radius;
      probes.push(
        { x: v.node.x - r, z: v.node.z },
        { x: v.node.x + r, z: v.node.z },
        { x: v.node.x, z: v.node.z - r },
        { x: v.node.x, z: v.node.z + r },
      );
      minX = Math.min(minX, v.node.x - r);
      maxX = Math.max(maxX, v.node.x + r);
      minZ = Math.min(minZ, v.node.z - r);
      maxZ = Math.max(maxZ, v.node.z + r);
    }
    const center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };

    // 从最贴近的缩放开始试，拉远到刚好全部进入安全框
    for (let k = 1; k <= MAX_ZOOM + 1e-6; k += 0.05) {
      const at = this.centeredTarget(probes, center, k);
      if (this.fitsAt(probes, at, k)) return { x: at.x, z: at.z, zoom: k };
    }
    const last = this.centeredTarget(probes, center, MAX_ZOOM);
    return { x: last.x, z: last.z, zoom: MAX_ZOOM };
  }

  /**
   * 求"让这批点在画面上居中"的相机目标点。
   * 斜俯视 + 透视会让地面区域在画面上偏上且近大远小，所以按投影后的实际包围盒迭代修正。
   */
  private centeredTarget(
    probes: Array<{ x: number; z: number }>,
    origin: { x: number; z: number },
    zoom: number,
  ): { x: number; z: number } {
    let x = origin.x;
    let z = origin.z;
    for (let i = 0; i < 3; i++) {
      this.placeCamera(x, z, zoom);
      const box = this.screenBox(probes);
      const p0 = this.projectGround(origin.x, origin.z);
      const kx = this.projectGround(origin.x + 1, origin.z).u - p0.u;
      const kz = this.projectGround(origin.x, origin.z + 1).v - p0.v;
      if (Math.abs(kx) < 1e-6 || Math.abs(kz) < 1e-6) break;
      x += ((box.uMin + box.uMax) / 2 - 0.5) / kx;
      z += ((box.vMin + box.vMax) / 2 - 0.52) / kz;
    }
    return { x, z };
  }

  /** 这批点投影后的屏幕包围盒（归一化坐标） */
  private screenBox(probes: Array<{ x: number; z: number }>): {
    uMin: number;
    uMax: number;
    vMin: number;
    vMax: number;
  } {
    let uMin = 1;
    let uMax = 0;
    let vMin = 1;
    let vMax = 0;
    for (const p of probes) {
      const s = this.projectGround(p.x, p.z);
      uMin = Math.min(uMin, s.u);
      uMax = Math.max(uMax, s.u);
      vMin = Math.min(vMin, s.v);
      vMax = Math.max(vMax, s.v);
    }
    return { uMin, uMax, vMin, vMax };
  }

  /** 在给定缩放下，这些点是否都落在安全框内（留出边距，避开顶部标题与底部留白） */
  private fitsAt(
    probes: Array<{ x: number; z: number }>,
    center: { x: number; z: number },
    zoom: number,
  ): boolean {
    this.placeCamera(center.x, center.z, zoom);
    for (const p of probes) {
      const s = this.projectGround(p.x, p.z);
      if (s.u < 0.08 || s.u > 0.92 || s.v < 0.16 || s.v > 0.84) return false;
    }
    return true;
  }

  /** 地面点 → 归一化屏幕坐标（u: 0 左 → 1 右；v: 0 上 → 1 下） */
  private projectGround(x: number, z: number): { u: number; v: number } {
    const v3 = new THREE.Vector3(x, this.layout.camera.lookAtY, z).project(this.camera);
    return { u: (v3.x + 1) / 2, v: (1 - v3.y) / 2 };
  }

  private clampTarget(): void {
    const b = this.layout.bounds;
    this.target.x = Math.min(Math.max(this.target.x, b.minX - 8), b.maxX + 8);
    this.target.y = Math.min(Math.max(this.target.y, b.minZ - 8), b.maxZ + 8);
  }

  // ---------- 输入：拖拽平移 / 点击选岛 ----------

  private bindPointer(): void {
    const el = this.domElement;
    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.drag.active = true;
      this.drag.moved = false;
      this.drag.startX = e.clientX;
      this.drag.startY = e.clientY;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.active || !this.drag.active) return;
      const dx = e.clientX - this.drag.lastX;
      const dy = e.clientY - this.drag.lastY;
      // 未超过阈值前不平移，保证轻点仍是轻点
      if (
        !this.drag.moved &&
        Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) < DRAG_THRESHOLD
      ) {
        return;
      }
      this.drag.moved = true;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      const rect = el.getBoundingClientRect();
      const camDist =
        Math.hypot(this.layout.camera.height, this.layout.camera.distance) * this.zoom;
      const visibleWidth =
        2 * camDist * Math.tan((this.layout.camera.fov * Math.PI) / 360) * this.camera.aspect;
      const perPixel = visibleWidth / rect.width;
      this.target.x -= dx * perPixel;
      this.target.y -= (dy * perPixel) / 0.6; // 斜俯视：纵向按俯角放大
      this.clampTarget();
      this.applyCamera();
    });
    const end = (e: PointerEvent) => {
      if (!this.active) return;
      const wasDrag = this.drag.moved;
      this.drag.active = false;
      this.drag.moved = false;
      if (!wasDrag) this.pickAt(e.clientX, e.clientY);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => {
      this.drag.active = false;
      this.drag.moved = false;
    });
  }

  private pickAt(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    if (hits.length === 0) return;
    const view = this.nodes.find((n) => n.island === hits[0].object);
    if (view) this.onTapNode(view.node.index);
  }

  // ---------- 动画 ----------

  /** 小岛弹跳（解锁/点击反馈） */
  bounce(index: number, height = 0.8, duration = 520): void {
    const view = this.nodeView(index);
    if (!view) return;
    Tweens.add({
      duration,
      ease: Ease.linear,
      onUpdate: (t) => {
        view.group.position.y = Math.sin(t * Math.PI) * height;
      },
      onComplete: () => {
        view.group.position.y = 0;
      },
    });
  }

  /** 锁定岛点击反馈：锁左右摇一下 */
  shakeLock(index: number): void {
    const view = this.nodeView(index);
    if (!view?.lock) return;
    Tweens.add({
      duration: 400,
      ease: Ease.linear,
      onUpdate: (t) => {
        if (view.lock) view.lock.rotation.z = Math.sin(t * Math.PI * 6) * 0.25 * (1 - t);
      },
      onComplete: () => {
        if (view.lock) view.lock.rotation.z = 0;
      },
    });
  }

  /**
   * 解锁动画：相机重新取景（把新解锁的关卡纳入画面）→ 新航线踏脚石逐颗弹出
   * → 新岛上色、锁消失 → 地标长出 → 弹跳。index 为新解锁的关卡序号。
   */
  playUnlock(index: number): void {
    const view = this.nodeView(index);
    if (!view) return;

    // 0~700ms 相机取景到"现在能玩的全部关卡"；0~520ms 刚通关的岛弹跳
    this.frameProgress(clearedLevelIds(), true);
    this.bounce(index - 1, 0.8, 520);

    // 500ms 起：新航线踏脚石逐颗弹出
    const trail = this.trails.find((t) => t.to === index);
    if (trail) {
      for (let i = trail.revealed; i < trail.count; i++) {
        this.after(500 + (i - trail.revealed) * 70, () => this.setTrailRevealed(trail, i + 1));
      }
    }

    // 900~1500ms：新岛上色
    this.after(900, () => {
      Tweens.add({
        duration: 600,
        ease: Ease.outQuad,
        onUpdate: (t) => this.setGrey(view, 1 - t),
        onComplete: () => {
          // 去锁、插地标与光环，然后地标长出、小岛弹跳
          this.applyState(view, 'current');
          const lm = view.landmark;
          if (lm) {
            lm.scale.setScalar(0.001);
            Tweens.add({
              duration: 500,
              ease: Ease.outBack,
              onUpdate: (t) => lm.scale.setScalar(Math.max(0.001, t)),
            });
          }
          this.bounce(index, 0.6, 500);
        },
      });
    });
  }

  /** 定时回调（挂在补间循环上，随场景重置一起清掉） */
  private after(ms: number, cb: () => void): void {
    Tweens.add({ duration: Math.max(1, ms), onUpdate: () => {}, onComplete: cb });
  }

  // ---------- 每帧 ----------

  /** 岛屿顶端的屏幕坐标（供 DOM 标签定位） */
  anchors(): NodeAnchor[] {
    const rect = this.domElement.getBoundingClientRect();
    const v = new THREE.Vector3();
    return this.nodes.map((view) => {
      const top = this.layout.camera.lookAtY + 2.6;
      v.set(view.node.x, top + view.group.position.y, view.node.z).project(this.camera);
      const x = rect.left + ((v.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - v.y) / 2) * rect.height;
      const onScreen = v.z < 1 && x > -80 && x < rect.width + 80 && y > -60 && y < rect.height + 60;
      return { index: view.node.index, x, y, visible: onScreen };
    });
  }

  private update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    const t = this.time / 1000;
    for (const view of this.nodes) {
      if (view.ring) {
        const pulse = 1 + Math.sin(t * 2.6) * 0.06;
        view.ring.scale.setScalar(view.node.radius * 1.05 * pulse);
        const mat = view.ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 + Math.sin(t * 2.6) * 0.25;
      }
      if (view.flagMesh) view.flagMesh.rotation.y = Math.sin(t * 2.2) * 0.25;
      if (view.lock) view.lock.position.y = 1.3 + Math.sin(t * 1.8 + view.node.index) * 0.08;
    }
    this.applyCamera();
  }
}
