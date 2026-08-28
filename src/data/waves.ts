/** 敌人属性与三波出怪序列（初始参考值，待试玩校准）。 */
export interface EnemyDef {
  id: 'goblin' | 'wolf' | 'captain';
  name: string;
  hp: number;
  /** 移动速度（像素/秒） */
  speed: number;
  /** 到达出口扣除的生命 */
  lifeCost: number;
  /** 与骑士交战时每秒伤害 */
  damage: number;
  textureKey: string;
}

export const ENEMY_DEFS: Record<EnemyDef['id'], EnemyDef> = {
  goblin: {
    id: 'goblin',
    name: '哥布林',
    hp: 40,
    speed: 55,
    lifeCost: 1,
    damage: 4,
    textureKey: 'enemy-goblin',
  },
  wolf: {
    id: 'wolf',
    name: '野狼',
    hp: 30,
    speed: 95,
    lifeCost: 1,
    damage: 6,
    textureKey: 'enemy-wolf',
  },
  captain: {
    id: 'captain',
    name: '哥布林队长',
    hp: 220,
    speed: 45,
    lifeCost: 3,
    damage: 10,
    textureKey: 'enemy-captain',
  },
};

export interface WaveSpawn {
  enemy: EnemyDef['id'];
  count: number;
  /** 同组内出怪间隔（毫秒） */
  intervalMs: number;
  /** 该组开始前的等待（毫秒） */
  delayMs: number;
}

export interface WaveDef {
  spawns: WaveSpawn[];
}

/** 出口生命 */
export const EXIT_LIVES = 6;

export const WAVES: WaveDef[] = [
  // 第 1 波：哥布林小队
  { spawns: [{ enemy: 'goblin', count: 6, intervalMs: 2200, delayMs: 1000 }] },
  // 第 2 波：哥布林 + 野狼
  {
    spawns: [
      { enemy: 'goblin', count: 4, intervalMs: 2000, delayMs: 1000 },
      { enemy: 'wolf', count: 4, intervalMs: 1800, delayMs: 4000 },
    ],
  },
  // 第 3 波：混合 + 哥布林队长压阵
  {
    spawns: [
      { enemy: 'goblin', count: 5, intervalMs: 1800, delayMs: 1000 },
      { enemy: 'wolf', count: 3, intervalMs: 1600, delayMs: 5000 },
      // intervalMs 不能为 0：难度缩放会给 count 加成，0 间隔会让多只队长在同一瞬间、
      // 同一位置生成（视觉上只有 1 只，实际叠了 5 倍血量）
      { enemy: 'captain', count: 1, intervalMs: 1200, delayMs: 8000 },
    ],
  },
];
