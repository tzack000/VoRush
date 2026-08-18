import * as THREE from 'three';
import { Tweens } from './Tween';
import { createIsland, createWater } from './terrain';

export type FrameCallback = (dtMs: number) => void;

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
    this.scene.background = new THREE.Color('#a8d8f0'); // 天空色

    // 固定斜俯视相机（微缩模型观感，FOV 小 + 远距离）
    this.camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      300,
    );
    this.camera.position.set(0, 44, 42);
    this.camera.lookAt(0, 1, 0);

    // 柔和光照：半球光 + 单一暖色平行光，无阴影贴图
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8fc97a, 1.0);
    const dir = new THREE.DirectionalLight(0xfff2dd, 1.2);
    dir.position.set(20, 30, 10);
    this.scene.add(hemi, dir);

    this.scene.add(createWater());
    this.scene.add(createIsland(pathWorld));

    window.addEventListener('resize', () => this.onResize(container));
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
