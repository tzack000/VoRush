import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  getLevel,
  isLevelUnlocked,
  scaleEnemy,
  scaleWaves,
} from '../src/data/levels';
import { ENEMY_DEFS, WAVES } from '../src/data/waves';

describe('关卡序列', () => {
  it('9 个有序关卡，第 1 关为动物伙伴教学关', () => {
    expect(LEVELS).toHaveLength(9);
    expect(getLevel(1).packId).toBe('animals-1');
    expect(getLevel(8).packId).toBe('t3d1');
    expect(getLevel(9).packId).toBe('t3d2');
  });

  it('第 1 关缩放恒等（基础数值）', () => {
    const s = getLevel(1).scale;
    expect(s.hpMult).toBe(1);
    expect(s.speedMult).toBe(1);
    expect(s.countBonus).toBe(0);
    const scaled = scaleEnemy(ENEMY_DEFS.goblin, s);
    expect(scaled.hp).toBe(ENEMY_DEFS.goblin.hp);
    expect(scaled.speed).toBe(ENEMY_DEFS.goblin.speed);
    expect(scaleWaves(WAVES, s)).toEqual(WAVES);
  });

  it('后续关卡敌人生命更高、数量更多、速度小幅提升', () => {
    const s5 = getLevel(5).scale;
    const g1 = scaleEnemy(ENEMY_DEFS.goblin, getLevel(1).scale);
    const g5 = scaleEnemy(ENEMY_DEFS.goblin, s5);
    expect(g5.hp).toBeGreaterThan(g1.hp);
    expect(g5.speed).toBeGreaterThanOrEqual(g1.speed);
    const w1 = scaleWaves(WAVES, getLevel(1).scale);
    const w5 = scaleWaves(WAVES, s5);
    const count = (waves: typeof WAVES) =>
      waves.flatMap((w) => w.spawns).reduce((n, s) => n + s.count, 0);
    expect(count(w5)).toBeGreaterThan(count(w1));
  });
});

describe('通关解锁', () => {
  it('第 1 关恒解锁', () => {
    expect(isLevelUnlocked(1, new Set())).toBe(true);
  });

  it('通关第 N 关解锁第 N+1 关', () => {
    const cleared = new Set<string>();
    expect(isLevelUnlocked(2, cleared)).toBe(false);
    cleared.add('animals-1');
    expect(isLevelUnlocked(2, cleared)).toBe(true);
    expect(isLevelUnlocked(3, cleared)).toBe(false);
    cleared.add('t1d1');
    expect(isLevelUnlocked(3, cleared)).toBe(true);
  });
});
