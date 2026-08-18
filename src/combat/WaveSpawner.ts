import type { EnemyDef, WaveDef } from '../data/waves';

interface SpawnEvent {
  atMs: number;
  enemy: EnemyDef['id'];
}

/** 按波次配置依次出怪；由场景在战斗未暂停时驱动 update。 */
export class WaveSpawner {
  private events: SpawnEvent[] = [];
  private elapsed = 0;
  private idx = 0;

  constructor(wave: WaveDef) {
    let cursor = 0;
    for (const group of wave.spawns) {
      cursor += group.delayMs;
      for (let i = 0; i < group.count; i++) {
        this.events.push({ atMs: cursor + i * group.intervalMs, enemy: group.enemy });
      }
      cursor += group.count * group.intervalMs;
    }
    this.events.sort((a, b) => a.atMs - b.atMs);
  }

  update(dtMs: number, spawn: (enemy: EnemyDef['id']) => void): void {
    this.elapsed += dtMs;
    while (this.idx < this.events.length && this.events[this.idx].atMs <= this.elapsed) {
      spawn(this.events[this.idx].enemy);
      this.idx += 1;
    }
  }

  /** 本波出怪队列是否已全部放出 */
  get finished(): boolean {
    return this.idx >= this.events.length;
  }
}
