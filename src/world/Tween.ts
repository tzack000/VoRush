/** 轻量补间：挂在渲染循环上，支持缓动、延迟与完成回调。 */
export type EaseFn = (t: number) => number;

export const Ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
} as const;

export interface TweenOptions {
  /** 时长（毫秒） */
  duration: number;
  ease?: EaseFn;
  /** 开始前延迟（毫秒） */
  delay?: number;
  /** 每帧回调，t 为缓动后的 0~1 进度 */
  onUpdate?: (t: number) => void;
  onComplete?: () => void;
}

interface ActiveTween extends Required<Omit<TweenOptions, 'delay' | 'onUpdate' | 'onComplete'>> {
  delay: number;
  elapsed: number;
  onUpdate?: (t: number) => void;
  onComplete?: () => void;
}

export class Tweens {
  private static active: ActiveTween[] = [];

  static add(opts: TweenOptions): void {
    this.active.push({
      duration: Math.max(1, opts.duration),
      ease: opts.ease ?? Ease.linear,
      delay: opts.delay ?? 0,
      elapsed: 0,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
    });
  }

  /** 每帧驱动（dtMs 毫秒） */
  static update(dtMs: number): void {
    for (const tw of [...this.active]) {
      if (tw.delay > 0) {
        tw.delay -= dtMs;
        continue;
      }
      tw.elapsed += dtMs;
      const raw = Math.min(1, tw.elapsed / tw.duration);
      tw.onUpdate?.(tw.ease(raw));
      if (raw >= 1) {
        this.active = this.active.filter((t) => t !== tw);
        tw.onComplete?.();
      }
    }
  }

  /** 场景重置/测试用 */
  static killAll(): void {
    this.active = [];
  }

  static get count(): number {
    return this.active.length;
  }
}
