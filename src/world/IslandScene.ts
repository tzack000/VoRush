import * as THREE from 'three';
import { Tweens } from './Tween';
import { createIsland, createReflection, createWater } from './terrain';
import { islandHeight, toWorld } from './coords';
import { makeBush, mulberry32 } from './models';
import { TOWER_SPOTS } from '../data/level';

export type FrameCallback = (dtMs: number) => void;

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
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private callbacks: FrameCallback[] = [];
  private clock = new THREE.Clock();
  private running = false;

  constructor(container: HTMLElement, pathWorld: Array<{ x: number; z: number }>) {
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

    // 柔和光照：灰调半球光 + 低强度暖色平行光（阴天的柔光），无阴影贴图
    const hemi = new THREE.HemisphereLight(0xd5dedd, 0xa8b39a, 1.1);
    const dir = new THREE.DirectionalLight(0xfff4e0, 0.85);
    dir.position.set(20, 30, 10);
    this.scene.add(hemi, dir);

    this.scene.add(createWater());
    const island = createIsland(pathWorld);
    this.scene.add(island);
    this.scene.add(createReflection(island));
    this.scatterBushes(pathWorld);

    window.addEventListener('resize', () => this.onResize(container));
  }

  /** 在平台上散布球状灌木（避开路径与塔位，确定性种子） */
  private scatterBushes(pathWorld: Array<{ x: number; z: number }>): void {
    const rand = mulberry32(20260819);
    const spots = TOWER_SPOTS.map(([x, y]) => toWorld(x, y));
    let placed = 0;
    let guard = 0;
    while (placed < 16 && guard++ < 400) {
      const x = (rand() - 0.5) * 42;
      const z = (rand() - 0.5) * 22;
      const h = islandHeight(x, z);
      if (h < 3.2) continue; // 只放在平台上
      // 避开路径
      let minPath = Number.MAX_VALUE;
      for (let i = 0; i < pathWorld.length - 1; i++) {
        const a = pathWorld[i];
        const b = pathWorld[i + 1];
        minPath = Math.min(minPath, distToSeg(x, z, a.x, a.z, b.x, b.z));
      }
      if (minPath < 2.4) continue;
      // 避开塔位
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;

      const bush = makeBush(placed * 7919 + 13);
      bush.scale.setScalar(1.5);
      bush.position.set(x, h - 0.1, z);
      this.scene.add(bush);
      placed += 1;
    }
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  onFrame(cb: FrameCallback): void {
    this.callbacks.push(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const dtMs = Math.min(100, this.clock.getDelta() * 1000);
      Tweens.update(dtMs);
      for (const cb of this.callbacks) cb(dtMs);
      this.renderer.render(this.scene, this.camera);
    });
  }

  /** 世界坐标 → 屏幕像素（供 DOM 教学高亮定位） */
  projectToScreen(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }
}
