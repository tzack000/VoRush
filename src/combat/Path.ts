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

  /** 距起点 dist 处的位置 */
  pointAt(dist: number): { x: number; z: number } {
    let remaining = Math.max(0, Math.min(dist, this.length));
    for (const s of this.segs) {
      if (remaining <= s.len) {
        const t = s.len === 0 ? 0 : remaining / s.len;
        return { x: s.x1 + (s.x2 - s.x1) * t, z: s.z1 + (s.z2 - s.z1) * t };
      }
      remaining -= s.len;
    }
    const last = this.segs[this.segs.length - 1];
    return { x: last.x2, z: last.z2 };
  }
}
