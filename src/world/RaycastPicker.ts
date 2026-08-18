import * as THREE from 'three';

export interface PickTarget {
  object: THREE.Object3D;
  /** 业务标识（如塔位索引、'crate'、塔引用 key） */
  id: string;
}

/**
 * RaycastPicker：指针拾取 3D 场景中的交互目标（塔位/补给箱/已建塔）。
 * UI 覆盖层打开时由调用方设置 enabled=false，屏蔽 3D 交互。
 */
export class RaycastPicker {
  enabled = true;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private targets = new Map<string, PickTarget>();

  constructor(
    private camera: THREE.Camera,
    domElement: HTMLElement,
    private onPick: (id: string) => void,
  ) {
    domElement.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.targets.size === 0) return;
      const rect = domElement.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const objects = [...this.targets.values()].map((t) => t.object);
      const hits = this.raycaster.intersectObjects(objects, true);
      if (hits.length === 0) return;
      // 向上找到注册的目标根对象
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        for (const target of this.targets.values()) {
          if (target.object === obj) {
            this.onPick(target.id);
            return;
          }
        }
        obj = obj.parent;
      }
    });
  }

  add(target: PickTarget): void {
    this.targets.set(target.id, target);
  }

  remove(id: string): void {
    this.targets.delete(id);
  }

  clear(): void {
    this.targets.clear();
  }
}
