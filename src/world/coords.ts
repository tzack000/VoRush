/** 2D 逻辑坐标（1280×720，沿用 levelMaps.ts）→ 3D 世界坐标（x, z）映射。 */
export const WORLD_WIDTH = 44;
export const WORLD_DEPTH = 24.75;

export function toWorld(x2d: number, y2d: number): { x: number; z: number } {
  return {
    x: (x2d / 1280 - 0.5) * WORLD_WIDTH,
    z: (y2d / 720 - 0.5) * WORLD_DEPTH,
  };
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 海岸线摆动项：低频决定大轮廓，高频加碎裂感 */
export interface WobbleTerm {
  amp: number;
  freq: number;
  phase: number;
}

/** 一座战斗岛屿的形状自由度 */
export interface IslandShape {
  /** 东西向椭圆半径（世界单位）。相机取景约束：不要超过 26 */
  radiusX: number;
  /** 南北向椭圆半径。15.0~16.5 之间变化，纵向视野余量充足 */
  radiusZ: number;
  /** 海岸线摆动；Σ|amp| ≤ 0.105 才不会把平台安全区吃小 */
  wobble: WobbleTerm[];
  /** 悬崖过渡起点（归一化半径） */
  edgeInner: number;
  /** 完全入水处 */
  edgeOuter: number;
  /** 平台高度 */
  plateauY: number;
  /** 水下高度 */
  underwaterY: number;
  /** 平台起伏幅度 */
  bumpAmp: number;
}

/** 与改造前的硬编码常量逐字段等价，保证第 1 关外观 100% 不变 */
export const DEFAULT_ISLAND_SHAPE: IslandShape = {
  radiusX: 26,
  radiusZ: 15.5,
  wobble: [
    { amp: 0.06, freq: 4, phase: 1.3 },
    { amp: 0.045, freq: 9, phase: 0.5 },
  ],
  edgeInner: 0.86,
  edgeOuter: 1.03,
  plateauY: 4.5,
  underwaterY: -1.7,
  bumpAmp: 0.25,
};

/** 纯函数版本：单测与地形校验用 */
export function islandHeightWith(s: IslandShape, x: number, z: number): number {
  const nx = x / s.radiusX;
  const nz = z / s.radiusZ;
  const theta = Math.atan2(nz, nx);
  let wobble = 1;
  for (const t of s.wobble) wobble += t.amp * Math.sin(theta * t.freq + t.phase);
  const rn = Math.hypot(nx, nz) * wobble;
  const t = smoothstep(s.edgeInner, s.edgeOuter, rn);
  const base = s.plateauY * (1 - t) + s.underwaterY * t;
  // 平台起伏（悬崖区不叠加）
  const bump = (1 - t) * s.bumpAmp * Math.sin(x * 0.5 + 1.1) * Math.sin(z * 0.6 - 0.7);
  return base + bump;
}

// 同一时刻只存在一座战斗岛屿，用模块级"当前形状"换取 islandHeight 签名不变
// （该函数在 terrain / IslandScene / LevelController / Game 六处以自由函数形式调用）。
// 设置入口唯一：IslandScene.buildTerrain 的首行。
let active: IslandShape = DEFAULT_ISLAND_SHAPE;

/** 只允许 IslandScene.buildTerrain 调用，且必须在创建任何岛屿实体之前 */
export function setIslandShape(s: IslandShape): void {
  active = s;
}

export function activeIslandShape(): IslandShape {
  return active;
}

/** 单测用：还原为默认形状，避免用例之间互相污染 */
export function resetIslandShape(): void {
  active = DEFAULT_ISLAND_SHAPE;
}

/** 当前岛屿的地形高度：高平台，边缘椭圆陡落成悬崖并沉入水下。 */
export function islandHeight(x: number, z: number): number {
  return islandHeightWith(active, x, z);
}
