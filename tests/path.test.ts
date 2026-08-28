import { describe, expect, it } from 'vitest';
import { Path } from '../src/combat/Path';
import { getLevelMap, type Pt2 } from '../src/data/levelMaps';

const line: Pt2[] = [
  [0, 0],
  [100, 0],
  [100, 100],
];

describe('路径弧长参数化', () => {
  it('首尾与中点定位正确', () => {
    const p = new Path(line.map(([x, y]) => ({ x, z: y })));
    expect(p.length).toBeCloseTo(200, 6);
    expect(p.pointAt(0)).toEqual({ x: 0, z: 0 });
    expect(p.pointAt(p.length)).toEqual({ x: 100, z: 100 });
    expect(p.pointAt(100)).toEqual({ x: 100, z: 0 });
    // 超出范围被夹紧
    expect(p.pointAt(-50)).toEqual({ x: 0, z: 0 });
    expect(p.pointAt(9999)).toEqual({ x: 100, z: 100 });
  });

  it('lateral 横向偏移：距离恰为给定值且垂直于该段', () => {
    const p = new Path(line.map(([x, y]) => ({ x, z: y })));
    for (const d of [0, 20, 80, 150, 199]) {
      const base = p.pointAt(d);
      const off = p.pointAt(d, 8);
      expect(Math.hypot(off.x - base.x, off.z - base.z)).toBeCloseTo(8, 6);
      // 该段方向 (1,0) 或 (0,1)，偏移必然垂直于它
      const t = p.tangentAt(d);
      const dot = (off.x - base.x) * t.x + (off.z - base.z) * t.z;
      expect(Math.abs(dot)).toBeLessThan(1e-9);
    }
  });

  it('tangentAt 给出单位方向', () => {
    const p = new Path(line.map(([x, y]) => ({ x, z: y })));
    for (const d of [1, 50, 99, 101, 150]) {
      const t = p.tangentAt(d);
      expect(Math.hypot(t.x, t.z)).toBeCloseTo(1, 9);
    }
  });

  it('分岔关卡：两条路在共享前缀上完全重合', () => {
    // 第 5 关 a/b 共享前 4 个点
    const map = getLevelMap(5);
    const a = new Path(map.paths[0].points.map(([x, y]) => ({ x, z: y })));
    const b = new Path(map.paths[1].points.map(([x, y]) => ({ x, z: y })));
    const prefixLen = Math.hypot(240, 0) + Math.hypot(0, 180) + Math.hypot(230, 0);
    for (let d = 0; d <= prefixLen; d += 10) {
      const pa = a.pointAt(d);
      const pb = b.pointAt(d);
      expect(pa.x).toBeCloseTo(pb.x, 9);
      expect(pa.z).toBeCloseTo(pb.z, 9);
    }
    // 岔口之后必须分道扬镳
    const far = a.pointAt(prefixLen + 200);
    const farB = b.pointAt(prefixLen + 200);
    expect(Math.hypot(far.x - farB.x, far.z - farB.z)).toBeGreaterThan(50);
  });

  it('合流关卡：两条路在共享后缀上完全重合', () => {
    const map = getLevelMap(6);
    const a = new Path(map.paths[0].points.map(([x, y]) => ({ x, z: y })));
    const b = new Path(map.paths[1].points.map(([x, y]) => ({ x, z: y })));
    // 末点相同，且末段之前的若干距离上位置一致
    for (const d of [0, 60, 120, 180, 240]) {
      const pa = a.pointAt(a.length - d);
      const pb = b.pointAt(b.length - d);
      expect(pa.x).toBeCloseTo(pb.x, 9);
      expect(pa.z).toBeCloseTo(pb.z, 9);
    }
  });
});
