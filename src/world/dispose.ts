import * as THREE from 'three';

/**
 * 递归释放 3D 对象的 GPU 资源（换关时重建地形/关卡实体用）。
 *
 * 注意：`models.ts` / `mapProps.ts` 的材质是模块级缓存共享的，它们带
 * `userData.shared = true` 标记，这里会跳过——误 dispose 会让后续关卡的
 * 敌人与塔全部变黑。
 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const withGeo = obj as THREE.Mesh;
    if (withGeo.geometry?.dispose) withGeo.geometry.dispose();

    const raw = (obj as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const material of list) {
      if (!material.userData.shared) material.dispose();
    }
  });
}
