import * as THREE from 'three';
import { islandHeight } from './coords';
import { mulberry32 } from '../data/rng';

/** Bad North 风格 pastel 调色板（低饱和、灰调） */
export const PALETTE = {
  grass: new THREE.Color('#a9bd8b'),
  grassDark: new THREE.Color('#97ad7c'),
  path: new THREE.Color('#d9cbb0'),
  sand: new THREE.Color('#ded3b3'),
  rock: new THREE.Color('#9a9aa0'),
  water: new THREE.Color('#9bb8b4'),
  reflection: new THREE.Color('#4a6a68'),
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

/** 一条路径的世界坐标折线 */
export type PathWorld = ReadonlyArray<{ x: number; z: number }>;

/**
 * 程序化微缩岛屿：PlaneGeometry 顶点位移（椭圆平台 + 悬崖落水），
 * 顶点着色区分草地 / 路径带 / 沙岸；flat shading 出低多边形面感。
 *
 * pathsWorld 可传多条（多路径关卡 / 分岔）；共享前缀被重复着色是幂等的。
 */
export function createIsland(pathsWorld: ReadonlyArray<PathWorld>): THREE.Mesh {
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

    // 到任意一条路径的最短距离
    let minPathDist = Number.MAX_VALUE;
    for (const pathWorld of pathsWorld) {
      for (let s = 0; s < pathWorld.length - 1; s++) {
        const a = pathWorld[s];
        const b = pathWorld[s + 1];
        minPathDist = Math.min(minPathDist, distToSegment(x, z, a.x, a.z, b.x, b.z));
      }
    }

    if (h < -0.35) {
      color.copy(PALETTE.sand).lerp(PALETTE.water, 0.55); // 水下暗沙
    } else if (h < 0.35) {
      color.copy(PALETTE.sand); // 岸线沙滩
    } else if (h < 3.1) {
      color.copy(PALETTE.rock); // 灰色悬崖岩壁（全高）
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

/**
 * 大地图用的微缩小岛：低多边形圆柱 + 顶点抖动，
 * 顶点色自上而下为草地 / 沙滩 / 岩裙；材质独立（解锁动画要 lerp 灰度）。
 */
export function createMapIsland(seed: number, radius: number): THREE.Mesh {
  const height = 2.2;
  const geo = new THREE.CylinderGeometry(radius, radius * 0.72, height, 13, 3);
  const rand = mulberry32(seed);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // 边缘抖动（上下缘与侧面），做出手工捏出来的轮廓
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (r > 0.01) {
      const jitter = 1 + (rand() - 0.5) * 0.16;
      pos.setX(i, pos.getX(i) * jitter);
      pos.setZ(i, pos.getZ(i) * jitter);
    }
    // 顶面轻微起伏
    if (y > height / 2 - 0.01) pos.setY(i, y + (rand() - 0.5) * 0.35);
  }

  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= height / 2 - 0.2) {
      const noise = Math.sin(pos.getX(i) * 1.3 + pos.getZ(i) * 1.7) * 0.5 + 0.5;
      color.copy(PALETTE.grass).lerp(PALETTE.grassDark, noise * 0.6);
    } else if (y >= -0.1) {
      color.copy(PALETTE.sand);
    } else {
      color.copy(PALETTE.rock);
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
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'map-island';
  return mesh;
}

/** 小岛在水面的柔和倒影 */
export function createMapReflection(island: THREE.Mesh, y = -0.6): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    color: PALETTE.reflection,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(island.geometry, mat);
  mesh.position.set(0.8, y, 1.4);
  mesh.scale.set(1.02, 1, 1.02);
  return mesh;
}

/** 水面：大平面，柔和灰蓝色。 */
export function createWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(300, 300);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.55,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.8;
  return mesh;
}

/** 岛屿在水面的柔和倒影（Bad North 标志性处理）：深色半透剪影，向阳面偏移。 */
export function createReflection(island: THREE.Mesh): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    color: PALETTE.reflection,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(island.geometry, mat);
  mesh.position.set(1.6, -0.78, 2.6);
  mesh.scale.set(1.05, 1, 1.05);
  return mesh;
}
