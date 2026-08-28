import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ISLAND_SHAPE,
  activeIslandShape,
  islandHeight,
  islandHeightWith,
  resetIslandShape,
  setIslandShape,
  toWorld,
} from '../src/world/coords';

/** 改造前的硬编码公式，用于证明参数化后行为完全一致 */
function legacyIslandHeight(x: number, z: number): number {
  const nx = x / 26;
  const nz = z / 15.5;
  const theta = Math.atan2(nz, nx);
  const wobble = 1 + 0.06 * Math.sin(theta * 4 + 1.3) + 0.045 * Math.sin(theta * 9 + 0.5);
  const rn = Math.sqrt(nx * nx + nz * nz) * wobble;
  const a = 0.86;
  const b = 1.03;
  const t0 = Math.min(1, Math.max(0, (rn - a) / (b - a)));
  const t = t0 * t0 * (3 - 2 * t0);
  const base = 4.5 * (1 - t) - 1.7 * t;
  const bump = (1 - t) * 0.25 * Math.sin(x * 0.5 + 1.1) * Math.sin(z * 0.6 - 0.7);
  return base + bump;
}

const SAMPLES: Array<[number, number]> = [
  [0, 0],
  [10, 5],
  [-20, -8],
  [26, 0],
  [0, 15.5],
  [-26, 15],
  [13, -12],
  [35, 20],
  [-40, -25],
  [5.5, -14.2],
];

describe('岛屿形状参数化', () => {
  afterEach(() => resetIslandShape());

  it('默认形状与改造前的硬编码公式逐点一致', () => {
    for (const [x, z] of SAMPLES) {
      expect(islandHeightWith(DEFAULT_ISLAND_SHAPE, x, z)).toBeCloseTo(
        legacyIslandHeight(x, z),
        12,
      );
    }
  });

  it('islandHeight 默认读的是默认形状', () => {
    for (const [x, z] of SAMPLES) {
      expect(islandHeight(x, z)).toBeCloseTo(islandHeightWith(DEFAULT_ISLAND_SHAPE, x, z), 12);
    }
  });

  it('setIslandShape 之后 islandHeight 跟着变，reset 后还原', () => {
    const custom = { ...DEFAULT_ISLAND_SHAPE, radiusZ: 16.2, bumpAmp: 0.3 };
    expect(islandHeight(8, 9)).toBeCloseTo(islandHeightWith(DEFAULT_ISLAND_SHAPE, 8, 9), 12);
    setIslandShape(custom);
    expect(islandHeight(8, 9)).toBeCloseTo(islandHeightWith(custom, 8, 9), 12);
    expect(islandHeight(8, 9)).not.toBeCloseTo(islandHeightWith(DEFAULT_ISLAND_SHAPE, 8, 9), 6);
    expect(activeIslandShape()).toBe(custom);
    resetIslandShape();
    expect(islandHeight(8, 9)).toBeCloseTo(islandHeightWith(DEFAULT_ISLAND_SHAPE, 8, 9), 12);
  });

  it('平台中心是平地，岛外沉入水下', () => {
    expect(islandHeight(0, 0)).toBeGreaterThan(4);
    expect(islandHeight(0, 0)).toBeLessThan(5);
    // 完全在椭圆外 → 水下
    expect(islandHeight(40, 0)).toBeLessThan(-1);
    expect(islandHeight(0, 30)).toBeLessThan(-1);
  });

  it('toWorld 与关卡逻辑坐标约定一致', () => {
    expect(toWorld(640, 360)).toEqual({ x: 0, z: 0 });
    expect(toWorld(1280, 720).x).toBeCloseTo(22, 12);
    expect(toWorld(1280, 720).z).toBeCloseTo(12.375, 12);
  });
});
