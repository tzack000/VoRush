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

/** 岛屿地形高度：高平台（4.5），边缘椭圆陡落成高悬崖并沉入水下（水面 y=-0.8）。
 *  轮廓带低频摆动避免完美椭圆；平台有轻微起伏增加手绘感。 */
export function islandHeight(x: number, z: number): number {
  const nx = x / 26;
  const nz = z / 15.5;
  const theta = Math.atan2(nz, nx);
  // 轮廓摆动：更低频、更不规则的海岸线
  const wobble = 1 + 0.06 * Math.sin(theta * 4 + 1.3) + 0.045 * Math.sin(theta * 9 + 0.5);
  const rn = Math.sqrt(nx * nx + nz * nz) * wobble;
  const t = smoothstep(0.86, 1.03, rn);
  const base = 4.5 * (1 - t) - 1.7 * t;
  // 平台起伏（悬崖区不叠加）
  const bump = (1 - t) * 0.25 * Math.sin(x * 0.5 + 1.1) * Math.sin(z * 0.6 - 0.7);
  return base + bump;
}
