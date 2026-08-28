import * as THREE from 'three';
import { makeBush, makeFlag, makeSpotRing, mulberry32 } from './models';
import type { LandmarkKind } from '../data/mapLayout';

/**
 * 大地图地标件：全部由基础几何体拼装，按词包主题组合成 3~6 件的小景。
 * 体量刻意做小（微缩模型观感），配合低多边形材质与现有调色板。
 */

const materialCache = new Map<number, THREE.MeshStandardMaterial>();

function mat(color: number): THREE.MeshStandardMaterial {
  let m = materialCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 });
    materialCache.set(color, m);
  }
  return m;
}

function part(
  geo: THREE.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  return m;
}

type Rand = () => number;

/** 针叶树：锥形树冠 + 树干 */
function tree(rand: Rand, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const h = (1.4 + rand() * 0.7) * scale;
  g.add(part(new THREE.CylinderGeometry(0.09 * scale, 0.12 * scale, h * 0.5, 5), 0x8b5a2b, 0, h * 0.25));
  g.add(part(new THREE.ConeGeometry(0.55 * scale, h * 0.8, 7), 0x6f9c5a, 0, h * 0.75));
  g.add(part(new THREE.ConeGeometry(0.4 * scale, h * 0.5, 7), 0x7fb069, 0, h * 1.05));
  return g;
}

/** 果树：球形树冠 + 果实点 */
function fruitTree(rand: Rand, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const h = (1.2 + rand() * 0.5) * scale;
  g.add(part(new THREE.CylinderGeometry(0.1 * scale, 0.13 * scale, h * 0.55, 5), 0x8b5a2b, 0, h * 0.27));
  g.add(part(new THREE.IcosahedronGeometry(0.6 * scale, 0), 0x7fb069, 0, h * 0.95));
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    g.add(
      part(
        new THREE.IcosahedronGeometry(0.12 * scale, 0),
        0xd4695f,
        Math.cos(a) * 0.45 * scale,
        h * 0.95 + (rand() - 0.5) * 0.3,
        Math.sin(a) * 0.45 * scale,
      ),
    );
  }
  return g;
}

/** 小屋：墙体 + 屋顶（颜色可换，区分主题） */
function hut(rand: Rand, roofColor: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const w = (0.9 + rand() * 0.3) * scale;
  g.add(part(new THREE.BoxGeometry(w, w * 0.8, w), 0xf2e6cf, 0, w * 0.4));
  g.add(part(new THREE.ConeGeometry(w * 0.85, w * 0.7, 4), roofColor, 0, w * 0.8 + w * 0.35));
  return g;
}

/** 篱笆：三根柱子 + 横杆 */
function fence(rand: Rand, scale = 1): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(part(new THREE.BoxGeometry(0.1 * scale, 0.6 * scale, 0.1 * scale), 0xb08968, i * 0.55 * scale - 0.55 * scale, 0.3 * scale));
  }
  g.add(part(new THREE.BoxGeometry(1.2 * scale, 0.07 * scale, 0.07 * scale), 0xb08968, 0, 0.45 * scale));
  g.rotation.y = rand() * Math.PI;
  return g;
}

/** 黑板（英语室/故事主题） */
function board(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(1.3 * scale, 0.8 * scale, 0.08 * scale), 0x4a6b52, 0, 0.8 * scale));
  g.add(part(new THREE.BoxGeometry(1.4 * scale, 0.1 * scale, 0.12 * scale), 0x8b5a2b, 0, 0.4 * scale));
  g.add(part(new THREE.BoxGeometry(0.1 * scale, 0.4 * scale, 0.1 * scale), 0x8b5a2b, -0.5 * scale, 0.2 * scale));
  g.add(part(new THREE.BoxGeometry(0.1 * scale, 0.4 * scale, 0.1 * scale), 0x8b5a2b, 0.5 * scale, 0.2 * scale));
  return g;
}

/** 石头平台（动物园/身体部位主题的空地） */
function platform(color: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(1.1 * scale, 1.25 * scale, 0.25 * scale, 9), color, 0, 0.12 * scale));
  return g;
}

/** 小动物剪影：椭球身体 + 头 + 耳朵/尾巴 */
function critter(color: number, earShape: 'long' | 'round', scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.IcosahedronGeometry(0.35 * scale, 0), color, 0, 0.4 * scale));
  g.add(part(new THREE.IcosahedronGeometry(0.2 * scale, 0), color, 0.42 * scale, 0.62 * scale));
  if (earShape === 'long') {
    g.add(part(new THREE.ConeGeometry(0.07 * scale, 0.28 * scale, 5), color, 0.4 * scale, 0.85 * scale));
    g.add(part(new THREE.ConeGeometry(0.07 * scale, 0.26 * scale, 5), color, 0.52 * scale, 0.83 * scale));
  } else {
    g.add(part(new THREE.SphereGeometry(0.09 * scale, 6, 5), color, 0.36 * scale, 0.79 * scale));
    g.add(part(new THREE.SphereGeometry(0.09 * scale, 6, 5), color, 0.5 * scale, 0.79 * scale));
  }
  g.add(part(new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 5), color, -0.36 * scale, 0.4 * scale).rotateZ(Math.PI * 0.75));
  return g;
}

/** 气球/帐篷（动作、故事主题的亮点） */
function balloon(color: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 1.1 * scale, 5), 0x8b5a2b, 0, 0.55 * scale));
  g.add(part(new THREE.SphereGeometry(0.42 * scale, 8, 6), color, 0, 1.5 * scale));
  return g;
}

/** 石拱（动物园/宠物主题的入口感） */
function rockArch(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.IcosahedronGeometry(0.5 * scale, 0), 0x9a9aa0, -0.7 * scale, 0.45 * scale));
  g.add(part(new THREE.IcosahedronGeometry(0.5 * scale, 0), 0x9a9aa0, 0.7 * scale, 0.45 * scale));
  g.add(part(new THREE.IcosahedronGeometry(0.45 * scale, 0), 0x8f8f96, 0, 1.05 * scale));
  return g;
}

type Recipe = (rand: Rand) => THREE.Object3D[];

/** 各主题的地标配方（3~6 件） */
const LANDMARK_RECIPES: Record<LandmarkKind, Recipe> = {
  // 草原哨站：树丛 + 篱笆
  meadow: (rand) => [
    tree(rand, 1.1),
    tree(rand, 0.85),
    makeBush(Math.floor(rand() * 9999)),
    fence(rand, 0.9),
  ],
  // 新朋友：两间小屋 + 树
  friends: (rand) => [hut(rand, 0xc05c5c), hut(rand, 0x4a90d9, 0.85), tree(rand)],
  // 好邻居：三间小屋 + 篱笆
  neighbours: (rand) => [
    hut(rand, 0x4a90d9),
    hut(rand, 0x27ae60, 0.9),
    hut(rand, 0xf39c12, 0.8),
    fence(rand),
  ],
  // 英语室：黑板 + 小屋 + 树
  classroom: (rand) => [board(1.1), hut(rand, 0x8e6bb5, 0.9), tree(rand, 0.9)],
  // 身体部位：石台 + 树 + 灌木
  body: (rand) => [platform(0xc9c2b2), tree(rand), makeBush(Math.floor(rand() * 9999))],
  // 动物园：石拱 + 两只动物 + 树
  zoo: (rand) => [
    rockArch(1.1),
    critter(0xb98b5e, 'long', 1.1),
    critter(0xd8d2c4, 'round', 0.9),
    tree(rand, 0.9),
  ],
  // 水果乐园：两棵果树 + 灌木
  orchard: (rand) => [fruitTree(rand, 1.15), fruitTree(rand, 0.9), makeBush(Math.floor(rand() * 9999))],
  // 动作故事：黑板 + 气球 + 树
  stories: (rand) => [board(), balloon(0xe86a6a, 1.1), tree(rand, 0.85)],
  // 宠物朋友：小屋 + 两只动物 + 灌木
  pets: (rand) => [
    hut(rand, 0xe08a4a, 0.85),
    critter(0xd8a25e, 'round'),
    critter(0xe8e0d0, 'long', 0.85),
    makeBush(Math.floor(rand() * 9999)),
  ],
};

/** 按主题生成地标组（含确定性散布） */
export function makeLandmark(kind: LandmarkKind, seed: number): THREE.Group {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  const parts = LANDMARK_RECIPES[kind](rand);
  const n = parts.length;
  parts.forEach((obj, i) => {
    // 沿小圆环均匀散布，带确定性偏移
    const a = (i / n) * Math.PI * 2 + rand() * 0.6;
    const r = 1.1 + rand() * 0.9;
    obj.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    obj.rotation.y = rand() * Math.PI * 2;
    group.add(obj);
  });
  return group;
}

/** 灰锁（未解锁小岛）：锁体 + 锁环 */
export function makeLock(scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(0.8 * scale, 0.7 * scale, 0.4 * scale), 0x8d8d94, 0, 0.35 * scale));
  g.add(
    part(new THREE.TorusGeometry(0.3 * scale, 0.08 * scale, 6, 14), 0x8d8d94, 0, 0.78 * scale).rotateX(
      Math.PI / 2,
    ),
  );
  return g;
}

/** 航线踏脚石：扁圆柱 */
export function makeSteppingStone(): THREE.Mesh {
  return part(new THREE.CylinderGeometry(0.42, 0.36, 0.16, 7), 0xcfc6ad);
}

/** 当前关光环：金色圆环，脉动提示"玩这一关" */
export function makeCurrentRing(radius: number): THREE.Mesh {
  const ring = makeSpotRing();
  ring.scale.setScalar(radius * 1.05);
  ring.material = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.85,
  });
  return ring;
}

/** 关卡旗帜（通关后插旗） */
export function makeBanner(): { group: THREE.Group; flagMesh: THREE.Mesh } {
  return makeFlag();
}
