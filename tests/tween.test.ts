import { describe, expect, it } from 'vitest';
import { Tweens, Ease } from '../src/world/Tween';

describe('Tweens', () => {
  it('按进度驱动 onUpdate 并在结束时 onComplete', () => {
    Tweens.killAll();
    const seen: number[] = [];
    let done = false;
    Tweens.add({
      duration: 100,
      onUpdate: (t) => seen.push(t),
      onComplete: () => {
        done = true;
      },
    });
    Tweens.update(50);
    expect(seen).toEqual([0.5]);
    Tweens.update(50);
    expect(seen[seen.length - 1]).toBe(1);
    expect(done).toBe(true);
    expect(Tweens.count).toBe(0);
  });

  it('delay 期间不触发 onUpdate', () => {
    Tweens.killAll();
    const seen: number[] = [];
    Tweens.add({ duration: 100, delay: 80, onUpdate: (t) => seen.push(t) });
    Tweens.update(50);
    Tweens.update(50); // delay 剩 0，本帧不推进
    expect(seen).toEqual([]);
    Tweens.update(50);
    expect(seen).toEqual([0.5]);
  });

  it('缓动函数边界值正确', () => {
    for (const fn of Object.values(Ease)) {
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
    }
  });
});
