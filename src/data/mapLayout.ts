import { LEVELS, isLevelUnlocked, type LevelDef } from './levels';

/** 地标类型：与词包主题对应，决定小岛上的装饰件组合 */
export type LandmarkKind =
  | 'meadow'
  | 'friends'
  | 'neighbours'
  | 'classroom'
  | 'body'
  | 'zoo'
  | 'orchard'
  | 'stories'
  | 'pets';

export interface MapNode {
  /** 1 起的关卡序号 */
  index: number;
  levelId: string;
  packId: string;
  x: number;
  z: number;
  radius: number;
  landmark: LandmarkKind;
  seed: number;
}

export interface MapTrail {
  from: number;
  to: number;
  stones: Array<{ x: number; z: number }>;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MapLayout {
  nodes: MapNode[];
  trails: MapTrail[];
  bounds: MapBounds;
  camera: { height: number; distance: number; lookAtY: number; fov: number };
}

export type NodeState = 'locked' | 'current' | 'cleared';

/** 手调坐标：从左下到右上的两行缓 S 形（单位：世界单位） */
const NODE_TABLE: Record<string, { x: number; z: number; radius: number; landmark: LandmarkKind }> = {
  'animals-1': { x: -46, z: 14, radius: 7, landmark: 'meadow' },
  t1d1: { x: -24, z: 9, radius: 6, landmark: 'friends' },
  t1d2: { x: -2, z: 14, radius: 6, landmark: 'neighbours' },
  t1d3: { x: 21, z: 8, radius: 6, landmark: 'classroom' },
  t2d1: { x: 44, z: 13, radius: 6, landmark: 'body' },
  t2d2: { x: 40, z: -12, radius: 6, landmark: 'zoo' },
  t2d3: { x: 16, z: -16, radius: 6, landmark: 'orchard' },
  t3d1: { x: -8, z: -11, radius: 6, landmark: 'stories' },
  t3d2: { x: -32, z: -15, radius: 6, landmark: 'pets' },
};

const FALLBACK_LANDMARKS: LandmarkKind[] = [
  'meadow',
  'friends',
  'neighbours',
  'classroom',
  'body',
  'zoo',
  'orchard',
  'stories',
  'pets',
];

const ROW_GAP = 22;
const COL_GAP = 23;
const ROW_LEN = 4;

/** 手调表之外的关卡（新增词包时自动续排）：蛇形两行，避开已有节点 */
export function fallbackNode(
  index: number,
  existing: MapNode[],
): { x: number; z: number; radius: number; landmark: LandmarkKind } {
  const i = index - 1;
  const row = Math.floor(i / ROW_LEN);
  const col = i % ROW_LEN;
  const leftToRight = row % 2 === 0;
  let x = leftToRight ? -46 + col * COL_GAP : 46 - col * COL_GAP;
  let z = 14 - row * ROW_GAP;
  const radius = 6;
  // 与已有节点过近时沿 z 方向推开，直到不重叠
  const minGap = radius + 8;
  for (let guard = 0; guard < 40; guard++) {
    const clash = existing.some((n) => Math.hypot(n.x - x, n.z - z) < minGap + n.radius);
    if (!clash) break;
    z -= 4;
  }
  return {
    x,
    z,
    radius,
    landmark: FALLBACK_LANDMARKS[i % FALLBACK_LANDMARKS.length],
  };
}

export function layoutBounds(nodes: MapNode[]): MapBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.radius);
    maxX = Math.max(maxX, n.x + n.radius);
    minZ = Math.min(minZ, n.z - n.radius);
    maxZ = Math.max(maxZ, n.z + n.radius);
  }
  if (nodes.length === 0) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  return { minX, maxX, minZ, maxZ };
}

/** 两岛之间的点状航线：沿弧线撒踏脚石 */
export function buildStones(a: MapNode, b: MapNode, seed: number): Array<{ x: number; z: number }> {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const count = Math.max(5, Math.min(9, Math.round(dist / 3.2)));
  const bow = seed % 2 === 0 ? 1 : -1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.max(0.001, dist);
  const px = -dz / len;
  const pz = dx / len;
  const stones: Array<{ x: number; z: number }> = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const off = Math.sin(t * Math.PI) * 2.4 * bow;
    stones.push({ x: a.x + dx * t + px * off, z: a.z + dz * t + pz * off });
  }
  return stones;
}

export function buildMapLayout(levels: LevelDef[] = LEVELS): MapLayout {
  const nodes: MapNode[] = [];
  levels.forEach((level, i) => {
    const index = i + 1;
    const tuned = NODE_TABLE[level.packId];
    const pos = tuned ?? fallbackNode(index, nodes);
    nodes.push({
      index,
      levelId: level.id,
      packId: level.packId,
      x: pos.x,
      z: pos.z,
      radius: pos.radius,
      landmark: pos.landmark,
      seed: 7919 * index + 13,
    });
  });

  const trails: MapTrail[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    trails.push({
      from: nodes[i].index,
      to: nodes[i + 1].index,
      stones: buildStones(nodes[i], nodes[i + 1], nodes[i].seed),
    });
  }

  return {
    nodes,
    trails,
    bounds: layoutBounds(nodes),
    camera: { height: 44, distance: 58, lookAtY: 0, fov: 32 },
  };
}

/** 下一个该玩的关卡：第一个未通关的关卡；全通则为最后一关 */
export function currentLevelIndex(
  nodes: MapNode[],
  cleared: ReadonlySet<string>,
): number {
  for (const node of nodes) {
    if (!cleared.has(node.levelId)) return node.index;
  }
  return nodes.length > 0 ? nodes[nodes.length - 1].index : 1;
}

/** 本次通关新解锁的关卡序号（1 起） */
export function newlyUnlocked(
  nodes: MapNode[],
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
): number[] {
  const out: number[] = [];
  for (const node of nodes) {
    if (!before.has(node.levelId) && after.has(node.levelId)) out.push(node.index);
  }
  return out;
}

/** 节点三态：已通关 / 当前可玩（第一个未通关且已解锁）/ 锁定 */
export function nodeState(
  nodes: MapNode[],
  index: number,
  cleared: ReadonlySet<string>,
): NodeState {
  const node = nodes.find((n) => n.index === index);
  if (!node) return 'locked';
  if (cleared.has(node.levelId)) return 'cleared';
  return isLevelUnlocked(index, cleared) ? 'current' : 'locked';
}

/**
 * 进入地图时需要取景的节点：全部已解锁关卡（已通关 + 当前关），
 * 外加紧随其后的第一个锁定关卡做诱饵，让玩家看得到"下一站在哪"。
 */
export function unlockedFrameIndices(
  nodes: MapNode[],
  cleared: ReadonlySet<string>,
): number[] {
  const out: number[] = [];
  for (const node of nodes) {
    out.push(node.index);
    if (nodeState(nodes, node.index, cleared) === 'locked') break;
  }
  return out;
}
