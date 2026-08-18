import * as THREE from 'three';
import { islandHeight } from './coords';

/** Bad North 风格 pastel 调色板 */
export const PALETTE = {
  grass: new THREE.Color('#8fc97a'),
  grassDark: new THREE.Color('#7dbb6b'),
  path: new THREE.Color('#d9c39a'),
  sand: new THREE.Color('#e8d9b0'),
  water: new THREE.Color('#79c4e0'),
} as const;

function distToSegment(
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
  const cx = x1 + t * dx;
  const cz = z1 + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

/**
 * 程序化微缩岛屿：PlaneGeometry 顶点位移（椭圆平台 + 悬崖落水），
 * 顶点着色区分草地 / 路径带 / 沙岸；flat shading 出低多边形面感。
 */
export function createIsland(pathWorld: Array<{ x: number; z: number }>): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(70, 44, 100, 64);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);

    // 到路径的最短距离
    let minPathDist = Number.MAX_VALUE;
    for (let s = 0; s < pathWorld.length - 1; s++) {
      const a = pathWorld[s];
      const b = pathWorld[s + 1];
      minPathDist = Math.min(minPathDist, distToSegment(x, z, a.x, a.z, b.x, b.z));
    }

    if (h < 0.5) {
      color.copy(PALETTE.sand); // 边缘沙岸
    } else if (minPathDist < 1.4) {
      color.copy(PALETTE.path); // 路径带
    } else {
      // 草地轻微明度变化，增加手绘感
      const noise = Math.sin(x * 1.7 + z * 2.3) * 0.5 + Math.sin(x * 0.6 - z * 1.1) * 0.5;
      color.copy(PALETTE.grass).lerp(PALETTE.grassDark, 0.5 + noise * 0.25);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
  });
  return new THREE.Mesh(geo, mat);
}

/** 水面：大平面，柔和蓝色。 */
export function createWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(300, 300);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.6,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.8;
  return mesh;
}
