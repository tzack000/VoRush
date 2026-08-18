/** 防御塔数值（初始参考值，待试玩校准）。三级线性升级，不做分支。 */
export interface ArcherLevel {
  damage: number;
  range: number;
  fireIntervalMs: number;
  /** 升到下一级费用；最高级为 null */
  upgradeCost: number | null;
}

export interface KnightLevel {
  knightHp: number;
  knightDamage: number;
  /** 骑士被击败后返回时间 */
  respawnMs: number;
  upgradeCost: number | null;
}

export interface TowerDefBase {
  id: 'archer' | 'knight';
  name: string;
  price: number;
  /** 儿童提示语 */
  hint: string;
  emoji: string;
}

export const ARCHER_TOWER: TowerDefBase & { levels: ArcherLevel[] } = {
  id: 'archer',
  name: '弓箭塔',
  price: 100,
  hint: '打得快',
  emoji: '🏹',
  levels: [
    { damage: 10, range: 150, fireIntervalMs: 600, upgradeCost: 80 },
    { damage: 16, range: 170, fireIntervalMs: 500, upgradeCost: 120 },
    { damage: 24, range: 190, fireIntervalMs: 400, upgradeCost: null },
  ],
};

export const KNIGHT_CAMP: TowerDefBase & { levels: KnightLevel[] } = {
  id: 'knight',
  name: '骑士营地',
  price: 100,
  hint: '拦住怪物',
  emoji: '🛡️',
  levels: [
    { knightHp: 60, knightDamage: 8, respawnMs: 8000, upgradeCost: 80 },
    { knightHp: 90, knightDamage: 12, respawnMs: 7000, upgradeCost: 120 },
    { knightHp: 130, knightDamage: 18, respawnMs: 6000, upgradeCost: null },
  ],
};

export const TOWER_DEFS = [ARCHER_TOWER, KNIGHT_CAMP];

/** 骑士拦截半径（像素） */
export const KNIGHT_ENGAGE_RADIUS = 70;
/** 骑士攻击间隔（毫秒） */
export const KNIGHT_ATTACK_INTERVAL_MS = 800;
