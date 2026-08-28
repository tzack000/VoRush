import { describe, expect, it } from 'vitest';
import { WaveSpawner } from '../src/combat/WaveSpawner';
import { LEVELS, scaleWaves } from '../src/data/levels';
import { WAVES } from '../src/data/waves';

/** 跑一遍 spawner，返回事件时间戳与敌人 id */
function schedule(waveIndex: number, levelIndex: number) {
  const wave = scaleWaves(WAVES, LEVELS[levelIndex - 1].scale)[waveIndex];
  const events: Array<{ atMs: number; enemy: string }> = [];
  const spawner = new WaveSpawner(wave);
  let t = 0;
  while (!spawner.finished && t < 120_000) {
    spawner.update(16, (enemy) => events.push({ atMs: t, enemy }));
    t += 16;
  }
  return { wave, events };
}

describe('波次缩放', () => {
  it('队长始终只有 1 只，不随难度加成', () => {
    for (let lv = 1; lv <= 9; lv++) {
      const captain = scaleWaves(WAVES, LEVELS[lv - 1].scale)[2].spawns.find(
        (s) => s.enemy === 'captain',
      );
      expect(captain?.count, `第 ${lv} 关队长数量`).toBe(1);
    }
  });

  it('小怪数量随关卡增长', () => {
    const first = scaleWaves(WAVES, LEVELS[0].scale)[0].spawns[0].count;
    const last = scaleWaves(WAVES, LEVELS[8].scale)[0].spawns[0].count;
    expect(last).toBeGreaterThan(first);
  });

  it('每组出怪间隔都大于 0（否则同组会在同一瞬间叠在一起）', () => {
    for (const wave of WAVES) {
      for (const s of wave.spawns) {
        if (s.count > 1) expect(s.intervalMs, `${s.enemy} 组间隔`).toBeGreaterThan(0);
      }
    }
  });

  it('第 9 关第 3 波：不会有两只怪在同一毫秒生成', () => {
    const { events } = schedule(2, 9);
    expect(events.length).toBeGreaterThan(5);
    const times = events.map((e) => e.atMs);
    expect(new Set(times).size, `出怪时间戳 ${times.join(',')}`).toBe(times.length);
  });

  it('第 1 关第 1 波：6 只哥布林按间隔依次出场', () => {
    const { events } = schedule(0, 1);
    expect(events.every((e) => e.enemy === 'goblin')).toBe(true);
    expect(events).toHaveLength(6);
  });
});
