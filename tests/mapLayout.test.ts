import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import {
  buildMapLayout,
  buildStones,
  currentLevelIndex,
  fallbackNode,
  layoutBounds,
  newlyUnlocked,
  nodeState,
  type MapNode,
} from '../src/data/mapLayout';

const layout = buildMapLayout(LEVELS);
const idsUpTo = (n: number) => new Set(LEVELS.slice(0, n).map((lv) => lv.id));

describe('地图布局', () => {
  it('每关一座岛，顺序与关卡一致', () => {
    expect(layout.nodes).toHaveLength(LEVELS.length);
    layout.nodes.forEach((node, i) => {
      expect(node.index).toBe(i + 1);
      expect(node.levelId).toBe(LEVELS[i].id);
      expect(node.packId).toBe(LEVELS[i].packId);
    });
  });

  it('已知词包使用手调坐标，岛屿互不重叠', () => {
    const first = layout.nodes[0];
    expect(first.packId).toBe('animals-1');
    expect(first.x).toBe(-46);
    expect(first.z).toBe(14);
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i];
        const b = layout.nodes[j];
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.radius + b.radius);
      }
    }
  });

  it('航线连接相邻关卡，踏脚石贴着连线', () => {
    expect(layout.trails).toHaveLength(layout.nodes.length - 1);
    layout.trails.forEach((trail, i) => {
      expect(trail.from).toBe(layout.nodes[i].index);
      expect(trail.to).toBe(layout.nodes[i + 1].index);
      expect(trail.stones.length).toBeGreaterThanOrEqual(4);
      const a = layout.nodes[i];
      const b = layout.nodes[i + 1];
      for (const stone of trail.stones) {
        // 到两端距离之和不超过直连距离 + 弧线弓高
        const d = Math.hypot(a.x - stone.x, a.z - stone.z) + Math.hypot(stone.x - b.x, stone.z - b.z);
        expect(d).toBeLessThan(Math.hypot(a.x - b.x, a.z - b.z) + 3);
      }
    });
  });

  it('bounds 包住全部岛屿', () => {
    const b = layoutBounds(layout.nodes);
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(b.minX);
      expect(n.x).toBeLessThanOrEqual(b.maxX);
      expect(n.z).toBeGreaterThanOrEqual(b.minZ);
      expect(n.z).toBeLessThanOrEqual(b.maxZ);
    }
  });

  it('新增词包时蛇形续排且不重叠', () => {
    const nodes: MapNode[] = layout.nodes;
    const extra = fallbackNode(nodes.length + 1, nodes);
    const candidate: MapNode = {
      index: nodes.length + 1,
      levelId: 'x1',
      packId: 'x1',
      seed: 1,
      ...extra,
      landmark: extra.landmark,
    };
    for (const n of nodes) {
      expect(Math.hypot(n.x - candidate.x, n.z - candidate.z)).toBeGreaterThanOrEqual(
        n.radius + candidate.radius,
      );
    }
  });

  it('踏脚石数量随距离自适应（不含两端岛屿）', () => {
    const a: MapNode = { index: 1, levelId: 'a', packId: 'a', x: 0, z: 0, radius: 6, landmark: 'meadow', seed: 1 };
    const near: MapNode = { ...a, index: 2, levelId: 'b', packId: 'b', x: 18, z: 0 };
    const far: MapNode = { ...a, index: 3, levelId: 'c', packId: 'c', x: 60, z: 0 };
    expect(buildStones(a, far, 2)).toHaveLength(8); // 上限 9 段 → 8 颗内部石
    expect(buildStones(a, near, 2).length).toBeLessThan(8);
  });
});

describe('进度状态', () => {
  it('currentLevelIndex：未通关为第 1 关，通关后推进，全通为末关', () => {
    expect(currentLevelIndex(layout.nodes, new Set())).toBe(1);
    expect(currentLevelIndex(layout.nodes, idsUpTo(1))).toBe(2);
    expect(currentLevelIndex(layout.nodes, idsUpTo(5))).toBe(6);
    expect(currentLevelIndex(layout.nodes, idsUpTo(LEVELS.length))).toBe(LEVELS.length);
  });

  it('nodeState：已通关 / 当前 / 锁定', () => {
    const cleared = idsUpTo(2);
    expect(nodeState(layout.nodes, 1, cleared)).toBe('cleared');
    expect(nodeState(layout.nodes, 2, cleared)).toBe('cleared');
    expect(nodeState(layout.nodes, 3, cleared)).toBe('current');
    expect(nodeState(layout.nodes, 4, cleared)).toBe('locked');
  });

  it('newlyUnlocked：只返回本次新通关的关卡', () => {
    const before = idsUpTo(1);
    const after = idsUpTo(2);
    expect(newlyUnlocked(layout.nodes, before, after)).toEqual([2]);
    expect(newlyUnlocked(layout.nodes, after, after)).toEqual([]);
  });
});
