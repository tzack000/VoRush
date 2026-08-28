import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import {
  getLevelMap,
  islandShapeFor,
  LEVEL_MAPS,
  type LevelMapDef,
  type Pt2,
} from '../src/data/levelMaps';
import { DEFAULT_ISLAND_SHAPE, islandHeightWith, toWorld } from '../src/world/coords';

/** 2D 逻辑坐标 → 该关卡地形下的高度 */
function heightAt(map: LevelMapDef, p: Pt2): number {
  const { x, z } = toWorld(p[0], p[1]);
  return islandHeightWith(map.shape, x, z);
}

/** 点到线段的最短距离（2D 逻辑像素） */
function distToSeg(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** 点到一条折线的最短距离 */
function distToPolyline(p: Pt2, points: readonly Pt2[]): number {
  let best = Number.MAX_VALUE;
  for (let i = 0; i < points.length - 1; i++) {
    best = Math.min(best, distToSeg(p[0], p[1], ...points[i], ...points[i + 1]));
  }
  return best;
}

function polylineLength(points: readonly Pt2[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return total;
}

/** 沿折线每 20px 取一个采样点 */
function samplePolyline(points: readonly Pt2[], step = 20): Pt2[] {
  const out: Pt2[] = [];
  const total = polylineLength(points);
  let carried = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    let d = carried;
    while (d <= segLen) {
      const t = segLen === 0 ? 0 : d / segLen;
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
      d += step;
    }
    carried = d - segLen;
  }
  if (out.length === 0 || polylineLength([out[out.length - 1], points[points.length - 1]]) > 1) {
    out.push(points[points.length - 1]);
  }
  void total;
  return out;
}

/** 两条折线的最长公共前缀长度（点数） */
function sharedPrefixLen(a: readonly Pt2[], b: readonly Pt2[]): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n][0] === b[n][0] && a[n][1] === b[n][1]) n++;
  return n;
}

/** 两条折线的最长公共后缀长度（点数） */
function sharedSuffixLen(a: readonly Pt2[], b: readonly Pt2[]): number {
  let n = 0;
  while (
    n < a.length &&
    n < b.length &&
    a[a.length - 1 - n][0] === b[b.length - 1 - n][0] &&
    a[a.length - 1 - n][1] === b[b.length - 1 - n][1]
  ) {
    n++;
  }
  return n;
}

/** 平台安全高度：低于此值会被着色成岩壁/沙滩 */
const ON_PLATEAU = 4.2;
/** 路面边缘允许的最低高度（路径带着色区要求 h ≥ 3.1） */
const ROAD_EDGE = 3.3;
/** 路径带半宽（世界 1.4 → 逻辑像素） */
const ROAD_HALF_PX = (1.4 * 1280) / 44;
/** 相机在 iPad 4:3 下能稳定取景的横向范围（实测余量收紧后的保守值） */
const VIEW_MIN_X = 120;
const VIEW_MAX_X = 1160;

describe('关卡地图数据', () => {
  it('9 张地图，序号 1..9，且与关卡定义是同一份对象', () => {
    expect(LEVEL_MAPS).toHaveLength(9);
    LEVEL_MAPS.forEach((map, i) => {
      expect(map.levelIndex).toBe(i + 1);
      expect(LEVELS[i].map).toBe(map);
    });
  });

  it('第 1 关沿用最初的路线与塔位（只把终点从水里挪到陆上）', () => {
    const m1 = getLevelMap(1);
    expect(m1.shape).toBe(DEFAULT_ISLAND_SHAPE);
    // 首点只是岛外的出怪桩，路线本身从 [240,600] 开始与最初一致
    expect(m1.paths[0].points.slice(1, 7)).toEqual([
      [240, 600],
      [240, 240],
      [560, 240],
      [560, 520],
      [880, 520],
      [880, 160],
    ]);
    expect(m1.towerSpots).toEqual([
      [140, 480],
      [340, 620],
      [340, 140],
      [460, 340],
      [660, 620],
      [660, 420],
      [800, 620],
      [980, 260],
    ]);
    // 旧终点 [1320,160] 在水下（h < 0），无法承载哨站
    expect(heightAt(m1, [1320, 160])).toBeLessThan(0);
    expect(heightAt(m1, m1.goals[0].at)).toBeGreaterThan(ON_PLATEAU);
  });

  it('爬升曲线：路径 1/1/1/2×6，哨站 1×6 然后 2×3', () => {
    expect(LEVEL_MAPS.map((m) => m.paths.length)).toEqual([1, 1, 1, 2, 2, 2, 2, 2, 2]);
    expect(LEVEL_MAPS.map((m) => m.goals.length)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2]);
    for (const m of LEVEL_MAPS) {
      expect(m.towerSpots.length).toBeGreaterThanOrEqual(m.levelIndex <= 3 ? 8 : 9);
      if (m.levelIndex >= 7) expect(m.towerSpots.length).toBeGreaterThanOrEqual(10);
    }
    for (const m of LEVEL_MAPS) {
      const wantTier = m.levelIndex >= 7 ? 2 : 1;
      for (const g of m.goals) expect(g.tier).toBe(wantTier);
    }
  });

  it('每条路径末点严格等于所属哨站，且每个哨站都被引用', () => {
    for (const m of LEVEL_MAPS) {
      for (const lane of m.paths) {
        const goal = m.goals.find((g) => g.id === lane.goalId);
        expect(goal, `关卡 ${m.levelIndex} 路径 ${lane.id} 指向不存在的哨站`).toBeDefined();
        expect(lane.points[lane.points.length - 1]).toEqual(goal!.at);
      }
      for (const g of m.goals) {
        expect(m.paths.some((l) => l.goalId === g.id)).toBe(true);
      }
    }
  });

  it('所有可玩元素都落在平台上，出怪口在岛外低处', () => {
    for (const m of LEVEL_MAPS) {
      for (const lane of m.paths) {
        // 首点是岛外的出怪桩，应低于平台
        expect(heightAt(m, lane.points[0]), `关卡 ${m.levelIndex} 出怪口不在岛外`).toBeLessThan(
          2.5,
        );
        for (const p of lane.points.slice(1)) {
          expect(heightAt(m, p), `关卡 ${m.levelIndex} 拐点 ${p} 不在平台上`).toBeGreaterThanOrEqual(
            ON_PLATEAU,
          );
        }
      }
      for (const g of m.goals) {
        expect(heightAt(m, g.at), `关卡 ${m.levelIndex} 哨站不在平台上`).toBeGreaterThanOrEqual(
          ON_PLATEAU,
        );
      }
      for (const s of m.towerSpots) {
        expect(heightAt(m, s), `关卡 ${m.levelIndex} 塔位 ${s} 不在平台上`).toBeGreaterThanOrEqual(
          ON_PLATEAU,
        );
      }
      for (const c of m.cratePositions) {
        expect(heightAt(m, c), `关卡 ${m.levelIndex} 箱位 ${c} 不在平台上`).toBeGreaterThanOrEqual(
          ON_PLATEAU,
        );
      }
    }
  });

  it('整条路面（含两侧路肩）都在平台范围内', () => {
    for (const m of LEVEL_MAPS) {
      for (const lane of m.paths) {
        // 跳过登陆段：出怪口故意放在水里，那段路本来就在岛外
        const ashore = lane.points.findIndex(
          (p, i) => i > 0 && heightAt(m, p) >= ON_PLATEAU - 0.2,
        );
        const road = lane.points.slice(ashore < 0 ? 1 : ashore);
        for (const [x, y] of samplePolyline(road)) {
          expect(heightAt(m, [x, y]), `关卡 ${m.levelIndex} 路面 ${x},${y} 塌陷`).toBeGreaterThanOrEqual(
            ON_PLATEAU - 0.2,
          );
          // 路肩：沿垂直于路面的方向左右各让出半个路宽
          void ROAD_HALF_PX;
          for (const [nx, ny] of [
            [x + ROAD_HALF_PX, y],
            [x - ROAD_HALF_PX, y],
            [x, y + ROAD_HALF_PX],
            [x, y - ROAD_HALF_PX],
          ] as Pt2[]) {
            expect(heightAt(m, [nx, ny]), `关卡 ${m.levelIndex} 路肩 ${nx},${ny} 掉下悬崖`).toBeGreaterThan(
              ROAD_EDGE,
            );
          }
        }
      }
    }
  });

  it('可玩元素都在相机视野内', () => {
    for (const m of LEVEL_MAPS) {
      const check = (p: Pt2, what: string) => {
        expect(p[0], `关卡 ${m.levelIndex} ${what} ${p} 超出视野`).toBeGreaterThanOrEqual(VIEW_MIN_X);
        expect(p[0], `关卡 ${m.levelIndex} ${what} ${p} 超出视野`).toBeLessThanOrEqual(VIEW_MAX_X);
      };
      for (const lane of m.paths) for (const p of lane.points.slice(1)) check(p, '拐点');
      for (const g of m.goals) check(g.at, '哨站');
      for (const s of m.towerSpots) check(s, '塔位');
      for (const c of m.cratePositions) check(c, '箱位');
    }
  });

  it('两条分支的非共享段保持 ≥100px 间距', () => {
    // 岔口/汇合点附近两支天然靠得近（那是分岔本身），只检查离岔口足够远的段落
    const JUNCTION_MARGIN = 150;
    for (const m of LEVEL_MAPS) {
      for (let i = 0; i < m.paths.length; i++) {
        for (let j = i + 1; j < m.paths.length; j++) {
          const a = m.paths[i].points;
          const b = m.paths[j].points;
          const pre = sharedPrefixLen(a, b);
          const suf = sharedSuffixLen(a, b);
          const aOwn = a.slice(Math.max(0, pre - 1), a.length - suf + 1);
          const bOwn = b.slice(Math.max(0, pre - 1), b.length - suf + 1);
          // 岔口与汇合点（仅当确实存在共享段时）
          const junctions: Pt2[] = [];
          if (pre > 0) junctions.push(a[pre - 1]);
          if (suf > 0) junctions.push(a[a.length - suf]);
          const nearJunction = (p: Pt2) =>
            junctions.some((j) => Math.hypot(j[0] - p[0], j[1] - p[1]) < JUNCTION_MARGIN);

          const check = (samples: Pt2[], other: readonly Pt2[], label: string) => {
            for (const p of samples) {
              if (nearJunction(p)) continue;
              expect(
                distToPolyline(p, other),
                `关卡 ${m.levelIndex} ${label} 在 ${p} 处贴太近`,
              ).toBeGreaterThan(100);
            }
          };
          check(
            samplePolyline(aOwn, 20),
            bOwn,
            `分支 ${m.paths[i].id} 对 ${m.paths[j].id}`,
          );
          check(
            samplePolyline(bOwn, 20),
            aOwn,
            `分支 ${m.paths[j].id} 对 ${m.paths[i].id}`,
          );
        }
      }
    }
  });

  it('塔位不压路、彼此不重叠，且每关至少有一个双路王牌位', () => {
    for (const m of LEVEL_MAPS) {
      const lanes = m.paths.map((l) => l.points);
      m.towerSpots.forEach((s, i) => {
        const dists = lanes.map((pts) => distToPolyline(s, pts));
        const nearest = Math.min(...dists);
        expect(nearest, `关卡 ${m.levelIndex} 塔位 ${s} 压在路上`).toBeGreaterThanOrEqual(70);
        expect(nearest, `关卡 ${m.levelIndex} 塔位 ${s} 够不到路`).toBeLessThanOrEqual(150);
        for (let j = i + 1; j < m.towerSpots.length; j++) {
          const d = Math.hypot(m.towerSpots[j][0] - s[0], m.towerSpots[j][1] - s[1]);
          expect(d, `关卡 ${m.levelIndex} 塔位 ${s} 与 ${m.towerSpots[j]} 重叠`).toBeGreaterThanOrEqual(
            100,
          );
        }
      });
      if (m.paths.length > 1) {
        const ace = m.towerSpots.filter((s) => lanes.every((pts) => distToPolyline(s, pts) <= 150));
        expect(ace.length, `关卡 ${m.levelIndex} 缺少能同时覆盖两条路的塔位`).toBeGreaterThan(0);
      }
    }
  });

  it('补给箱位避开路径与塔位', () => {
    for (const m of LEVEL_MAPS) {
      for (const c of m.cratePositions) {
        for (const lane of m.paths) {
          expect(distToPolyline(c, lane.points), `关卡 ${m.levelIndex} 箱位 ${c} 压路`).toBeGreaterThanOrEqual(
            80,
          );
        }
        for (const s of m.towerSpots) {
          expect(
            Math.hypot(s[0] - c[0], s[1] - c[1]),
            `关卡 ${m.levelIndex} 箱位 ${c} 压塔位`,
          ).toBeGreaterThanOrEqual(90);
        }
      }
    }
  });

  it('同一关的两条路长度接近，且行军时长合理', () => {
    for (const m of LEVEL_MAPS) {
      const lengths = m.paths.map((l) => polylineLength(l.points));
      for (const L of lengths) {
        expect(L, `关卡 ${m.levelIndex} 路径过短`).toBeGreaterThanOrEqual(1400);
        expect(L, `关卡 ${m.levelIndex} 路径过长`).toBeLessThanOrEqual(2700);
      }
      if (lengths.length > 1) {
        expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThanOrEqual(1.15);
      }
    }
  });

  it('岛屿轮廓生成器：radiusX 恒定、摆动幅度有上限、逐关不同', () => {
    expect(islandShapeFor(1)).toBe(DEFAULT_ISLAND_SHAPE);
    const shapes = LEVEL_MAPS.map((m) => m.shape);
    for (const s of shapes) {
      expect(s.radiusX).toBe(26);
      expect(s.radiusZ).toBeGreaterThanOrEqual(15.0);
      expect(s.radiusZ).toBeLessThanOrEqual(16.5);
      const budget = s.wobble.reduce((acc, w) => acc + Math.abs(w.amp), 0);
      expect(budget).toBeLessThanOrEqual(0.105 + 1e-9);
    }
    // 每关轮廓都不一样
    const keys = new Set(shapes.map((s) => JSON.stringify(s.wobble)));
    expect(keys.size).toBe(9);
    // 快照：防止改动随机数让手写坐标悄悄失效
    expect(shapes.map((s) => [s.radiusZ, s.wobble[0].freq, s.wobble[1].freq])).toMatchSnapshot();
  });
});
