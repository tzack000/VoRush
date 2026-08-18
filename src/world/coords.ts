/** 2D 逻辑坐标（1280×720，沿用 data/level.ts）→ 3D 世界坐标（x, z）映射。 */
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

/** 岛屿地形高度：中央平台 2.2，边缘椭圆缓落并沉入水下（水面 y=-0.8）。
 *  椭圆略大于路径出入点（x≈±23.3），保证敌人从沙滩走出而非水下。 */
export function islandHeight(x: number, z: number): number {
  const rn = Math.sqrt((x / 26) ** 2 + (z / 15.5) ** 2);
  const t = smoothstep(0.8, 1.08, rn);
  return 2.2 * (1 - t) - 1.6 * t;
}
