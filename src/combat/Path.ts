/** 逻辑路径：世界坐标折线 + 弧长参数化。 */
export class Path {
  readonly length: number;
  private segs: Array<{ x1: number; z1: number; x2: number; z2: number; len: number }> = [];

  constructor(points: ReadonlyArray<{ x: number; z: number }>) {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      this.segs.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, len });
      total += len;
    }
    this.length = total;
  }

  /**
   * 距起点 dist 处的位置。
   * lateral > 0 时向路径左侧横向偏移（打散共享前缀上完全重叠的敌人）；
   * 幅度要小（≤ 8 逻辑像素），否则拐点处法向突变会看出来。
   */
  pointAt(dist: number, lateral = 0): { x: number; z: number } {
    let remaining = Math.max(0, Math.min(dist, this.length));
    for (const s of this.segs) {
      if (remaining <= s.len) {
        const t = s.len === 0 ? 0 : remaining / s.len;
        const x = s.x1 + (s.x2 - s.x1) * t;
        const z = s.z1 + (s.z2 - s.z1) * t;
        if (lateral === 0) return { x, z };
        // 段方向的左法向
        const nx = -(s.z2 - s.z1) / s.len;
        const nz = (s.x2 - s.x1) / s.len;
        return { x: x + nx * lateral, z: z + nz * lateral };
      }
      remaining -= s.len;
    }
    const last = this.segs[this.segs.length - 1];
    return { x: last.x2, z: last.z2 };
  }

  /** 该处的行进方向（单位向量），供哨站朝向使用 */
  tangentAt(dist: number): { x: number; z: number } {
    let remaining = Math.max(0, Math.min(dist, this.length));
    for (const s of this.segs) {
      if (remaining <= s.len) {
        return { x: (s.x2 - s.x1) / s.len, z: (s.z2 - s.z1) / s.len };
      }
      remaining -= s.len;
    }
    const last = this.segs[this.segs.length - 1];
    return { x: (last.x2 - last.x1) / last.len, z: (last.z2 - last.z1) / last.len };
  }
}
