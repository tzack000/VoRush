import { describe, expect, it } from 'vitest';
import { clearedLevelIds, clearKey, readClear, starCount, writeClear } from '../src/data/progress';
import type { ProgressStorage } from '../src/data/progress';

function fakeStorage(seed: Record<string, string> = {}): ProgressStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('通关进度读写', () => {
  it('键名含关卡 id', () => {
    expect(clearKey('t3d1')).toBe('vorush.clear.t3d1');
  });

  it('缺失或坏数据回退为未通关', () => {
    const s = fakeStorage({ [clearKey('t1d1')]: '{不是 JSON' });
    expect(readClear('t1d1', s)).toEqual({ clear: false, know: false, review: false });
    expect(readClear('t1d2', s)).toEqual({ clear: false, know: false, review: false });
  });

  it('写入后可读回，字段非布尔按 false 处理', () => {
    const s = fakeStorage();
    writeClear('t2d1', { clear: true, know: true, review: false }, s);
    expect(readClear('t2d1', s)).toEqual({ clear: true, know: true, review: false });
    s.data[clearKey('t2d2')] = JSON.stringify({ clear: 'yes', know: true });
    expect(readClear('t2d2', s)).toEqual({ clear: false, know: true, review: false });
  });

  it('starCount 统计获得的星星数', () => {
    expect(starCount({ clear: true, know: true, review: true })).toBe(3);
    expect(starCount({ clear: true, know: false, review: true })).toBe(2);
    expect(starCount({ clear: false, know: false, review: false })).toBe(0);
  });

  it('clearedLevelIds 只含拿到通关星的关卡', () => {
    const s = fakeStorage();
    writeClear('animals-1', { clear: true, know: true, review: false }, s);
    writeClear('t1d1', { clear: false, know: true, review: true }, s);
    const ids = clearedLevelIds(s);
    expect([...ids]).toEqual(['animals-1']);
  });
});
