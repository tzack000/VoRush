import { ENEMY_DEFS, WAVES, type EnemyDef, type WaveDef } from './waves';
import { getLevelMap, type LevelMapDef } from './levelMaps';

/** 难度缩放参数（初始参考值，待试玩校准） */
export interface DifficultyScale {
  /** 敌人生命倍率 */
  hpMult: number;
  /** 敌人速度倍率 */
  speedMult: number;
  /** 每组出怪数量加成 */
  countBonus: number;
}

export interface LevelDef {
  /** 关卡序号（1 起） */
  index: number;
  /** 与词包 id 一致（通关标记/学习记录键复用） */
  id: string;
  packId: string;
  scale: DifficultyScale;
  /** 该关的地形、入侵路径与守护目标 */
  map: LevelMapDef;
}

function scaleFor(index: number): DifficultyScale {
  return {
    hpMult: 1 + 0.15 * (index - 1),
    speedMult: 1 + 0.04 * (index - 1),
    countBonus: Math.floor((index - 1) / 2),
  };
}

const PACK_ORDER = [
  'animals-1',
  't1d1',
  't1d2',
  't1d3',
  't2d1',
  't2d2',
  't2d3',
  't3d1',
  't3d2',
] as const;

/** 有序关卡：第 N 关绑定词包 PACK_ORDER[N-1]，难度随序号递增 */
export const LEVELS: LevelDef[] = PACK_ORDER.map((packId, i) => ({
  index: i + 1,
  id: packId,
  packId,
  scale: scaleFor(i + 1),
  map: getLevelMap(i + 1),
}));

export function getLevel(index: number): LevelDef {
  const lv = LEVELS.find((x) => x.index === index);
  if (!lv) throw new Error(`unknown level: ${index}`);
  return lv;
}

/** 通关解锁：第 1 关恒解锁；第 N 关需第 N-1 关已通关 */
export function isLevelUnlocked(index: number, clearedIds: ReadonlySet<string>): boolean {
  if (index <= 1) return true;
  const prev = LEVELS[index - 2];
  return prev !== undefined && clearedIds.has(prev.id);
}

/** 敌人属性按关卡缩放 */
export function scaleEnemy(def: EnemyDef, scale: DifficultyScale): EnemyDef {
  return {
    ...def,
    hp: Math.round(def.hp * scale.hpMult),
    speed: Math.round(def.speed * scale.speedMult),
  };
}

/**
 * 波次按关卡缩放：每组出怪 +countBonus（至少 1 只）。
 * 原本只有 1 只的组不加成——队长是压阵的精英，堆成 5 只会让第 9 关直接崩盘。
 */
export function scaleWaves(base: WaveDef[], scale: DifficultyScale): WaveDef[] {
  return base.map((wave) => ({
    spawns: wave.spawns.map((s) => ({
      ...s,
      count: s.count > 1 ? Math.max(1, s.count + scale.countBonus) : s.count,
    })),
  }));
}

export { ENEMY_DEFS };
