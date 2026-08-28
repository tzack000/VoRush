import { DEFAULT_ISLAND_SHAPE, type IslandShape } from '../world/coords';
import { mulberry32 } from '../world/models';

/** 2D 逻辑坐标（1280×720），与 toWorld 的映射口径一致 */
export type Pt2 = readonly [number, number];

/** 守护目标：敌人抵达即扣生命 */
export interface GoalDef {
  id: string;
  /** 哨站中心，必须落在岛屿平台上 */
  at: Pt2;
  /** 1 = 木哨站（1-6 关）；2 = 石堡（7-9 关） */
  tier: 1 | 2;
  label: string;
}

/**
 * 一条入侵路径。末点必须严格等于所属 goal 的 at。
 *
 * 分岔与合流不需要运行时概念：两条折线共享前缀就是"一起走然后分开"，
 * 共享后缀就是"合流后再一起冲向哨站"。
 */
export interface LanePathDef {
  id: string;
  points: readonly Pt2[];
  goalId: string;
}

export interface LevelMapDef {
  levelIndex: number;
  name: string;
  shape: IslandShape;
  bushSeed: number;
  bushCount: number;
  paths: readonly LanePathDef[];
  goals: readonly GoalDef[];
  towerSpots: readonly Pt2[];
  cratePositions: readonly Pt2[];
}

/**
 * 程序化岛屿轮廓：只动海岸线摆动谐波、南北半径与平台起伏。
 * radiusX 恒为 26 —— 相机是固定斜俯视，横向再大会把岛屿两端推出画面。
 */
export function islandShapeFor(index: number): IslandShape {
  // 第 1 关沿用熟悉的海岸线
  if (index === 1) return DEFAULT_ISLAND_SHAPE;
  const rand = mulberry32(0x150 + index * 7919);
  // 与默认形状同等的内凹幅度上限，保证平台安全区不被吃小
  const BUDGET = 0.105;
  const a1 = 0.042 + rand() * 0.028;
  const a2 = Math.max(0.02, BUDGET - a1);
  return {
    radiusX: 26,
    radiusZ: 15.2 + rand() * 1.2,
    wobble: [
      { amp: a1, freq: 3 + Math.floor(rand() * 3), phase: rand() * Math.PI * 2 },
      { amp: a2, freq: 7 + Math.floor(rand() * 4), phase: rand() * Math.PI * 2 },
    ],
    edgeInner: 0.86,
    edgeOuter: 1.03,
    plateauY: 4.5,
    underwaterY: -1.7,
    bumpAmp: 0.18 + rand() * 0.12,
  };
}

/**
 * 9 张手写地图。爬升曲线：
 * - 1-3 关：1 条路 1 座哨站（熟悉基本玩法）
 * - 4-6 关：2 条路仍守 1 座哨站（学会分兵；5 关分岔、6 关合流）
 * - 7-9 关：2 条路 2 座哨站（全场调度）
 *
 * 坐标约束见 tests/levelMaps.test.ts：可玩元素须在平台上、留在相机视野内，
 * 两条分支中心线间距 ≥ 100px，塔位距最近路径 70~150px。
 */
export const LEVEL_MAPS: LevelMapDef[] = [
  // 1 · 草原哨站：沿用最初的路线，只把终点从水里挪到陆上
  {
    levelIndex: 1,
    name: '草原哨站',
    shape: islandShapeFor(1),
    bushSeed: 20260819,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 600],
          [240, 600],
          [240, 240],
          [560, 240],
          [560, 520],
          [880, 520],
          [880, 160],
          [1075, 205],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [1075, 205], tier: 1, label: '草原哨站' }],
    towerSpots: [
      [140, 480],
      [340, 620],
      [340, 140],
      [460, 340],
      [660, 620],
      [660, 420],
      [800, 620],
      [980, 260],
    ],
    cratePositions: [
      [150, 320],
      [980, 600],
      [1120, 470],
    ],
  },

  // 2 · 北岸长弯：从北面登陆、终点在西侧，与第 1 关反向
  {
    levelIndex: 2,
    name: '北岸长弯',
    shape: islandShapeFor(2),
    bushSeed: 20260820,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          // 出怪口要真的落在水里：第 2 关岛屿偏小（radiusZ 15.26），y=-60 还在平台上
          [640, -200],
          [640, 150],
          [980, 150],
          [980, 420],
          [700, 420],
          [700, 620],
          [380, 620],
          [380, 330],
          [180, 330],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [180, 330], tier: 1, label: '西岭哨站' }],
    towerSpots: [
      [520, 80],
      [820, 250],
      [1090, 290],
      [860, 530],
      [600, 480],
      [460, 520],
      [250, 480],
      [250, 200],
    ],
    cratePositions: [
      [340, 120],
      [800, 660],
      [1100, 520],
    ],
  },

  // 3 · 回旋道：向内盘旋，哨站在岛心
  {
    levelIndex: 3,
    name: '回旋道',
    shape: islandShapeFor(3),
    bushSeed: 20260821,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          // 第 3 关西岸海岸线更靠外，出怪口要再往西推才落在水里
          [-180, 480],
          [200, 480],
          [200, 200],
          [560, 200],
          [560, 120],
          [900, 120],
          [900, 520],
          [460, 520],
          [460, 380],
          [700, 380],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [700, 380], tier: 1, label: '岛心哨站' }],
    towerSpots: [
      [120, 330],
      [340, 330],
      [400, 100],
      [700, 220],
      [1030, 300],
      [780, 430],
      [600, 660],
      [330, 530],
    ],
    cratePositions: [
      [1080, 200],
      [1080, 470],
      [820, 650],
    ],
  },

  // 4 · 两处登陆：西岸两个海滩各一条 S 形，东侧汇入同一座哨站
  {
    levelIndex: 4,
    name: '两处登陆',
    shape: islandShapeFor(4),
    bushSeed: 20260822,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 250],
          [260, 250],
          [260, 130],
          [520, 130],
          [520, 290],
          [780, 290],
          [780, 140],
          [1030, 140],
          [1030, 360],
        ],
      },
      {
        id: 'b',
        goalId: 'g1',
        points: [
          [-180, 470],
          [260, 470],
          [260, 590],
          [520, 590],
          [520, 430],
          [780, 430],
          [780, 580],
          [1030, 580],
          [1030, 360],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [1030, 360], tier: 1, label: '双滩哨站' }],
    towerSpots: [
      [140, 360],
      [390, 205],
      [390, 515],
      [640, 210],
      [640, 510],
      [900, 210],
      [900, 510],
      [640, 360],
      [1150, 360],
    ],
    cratePositions: [
      [640, 70],
      [640, 650],
      [1120, 250],
    ],
  },

  // 5 · 分岔口：共享前缀 650px，岔口后南北两支，最后汇回同一哨站
  {
    levelIndex: 5,
    name: '分岔口',
    shape: islandShapeFor(5),
    bushSeed: 20260823,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 300],
          [200, 300],
          [200, 480],
          [430, 480],
          [430, 190],
          [700, 190],
          [700, 330],
          [980, 330],
          [1080, 400],
        ],
      },
      {
        id: 'b',
        goalId: 'g1',
        points: [
          [-180, 300],
          [200, 300],
          [200, 480],
          [430, 480],
          [430, 620],
          [760, 620],
          [760, 500],
          [1000, 500],
          [1080, 400],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [1080, 400], tier: 1, label: '岔口哨站' }],
    towerSpots: [
      [300, 390],
      [300, 200],
      [560, 330],
      [560, 540],
      [860, 250],
      [860, 420],
      [1000, 250],
      [1150, 470],
      [980, 620],
    ],
    cratePositions: [
      [200, 180],
      [640, 90],
      [1100, 290],
    ],
  },

  // 6 · 双滩合流：南北两路在 [760,360] 合流，共享后缀冲向哨站
  {
    levelIndex: 6,
    name: '双滩合流',
    shape: islandShapeFor(6),
    bushSeed: 20260824,
    bushCount: 16,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 140],
          [280, 140],
          [280, 240],
          [520, 240],
          [520, 120],
          [760, 120],
          [760, 360],
          [980, 360],
          [980, 220],
          [1120, 290],
        ],
      },
      {
        id: 'b',
        goalId: 'g1',
        points: [
          [-180, 580],
          [280, 580],
          [280, 480],
          [520, 480],
          [520, 600],
          [760, 600],
          [760, 360],
          [980, 360],
          [980, 220],
          [1120, 290],
        ],
      },
    ],
    goals: [{ id: 'g1', at: [1120, 290], tier: 1, label: '合流堡' }],
    towerSpots: [
      [860, 470],
      [660, 470],
      [660, 250],
      [400, 350],
      [160, 270],
      [160, 450],
      [400, 130],
      [400, 590],
      [1000, 470],
    ],
    cratePositions: [
      [880, 80],
      [880, 650],
      [1120, 470],
    ],
  },

  // 7 · 分岔双哨站：前缀只有 460px，堵岔口不够，两边都得有防御
  {
    levelIndex: 7,
    name: '分岔双哨站',
    shape: islandShapeFor(7),
    bushSeed: 20260825,
    bushCount: 14,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 360],
          [220, 360],
          [420, 360],
          [420, 180],
          [640, 180],
          [640, 80],
          [900, 80],
          [900, 220],
          [1080, 220],
        ],
      },
      {
        id: 'b',
        goalId: 'g2',
        points: [
          [-180, 360],
          [220, 360],
          [420, 360],
          [420, 540],
          [640, 540],
          [640, 640],
          [900, 640],
          [900, 500],
          [1080, 500],
        ],
      },
    ],
    goals: [
      { id: 'g1', at: [1080, 220], tier: 2, label: '北崖堡' },
      { id: 'g2', at: [1080, 500], tier: 2, label: '南崖堡' },
    ],
    towerSpots: [
      [200, 250],
      [200, 470],
      [520, 270],
      [520, 450],
      [780, 160],
      [780, 560],
      [660, 290],
      [660, 430],
      [960, 360],
      [1120, 360],
    ],
    cratePositions: [
      [500, 90],
      [500, 640],
      [980, 600],
    ],
  },

  // 8 · 两侧登陆：两条 S 形互锁、180° 旋转对称，各奔一座石堡
  {
    levelIndex: 8,
    name: '两侧登陆',
    shape: islandShapeFor(8),
    bushSeed: 20260826,
    bushCount: 14,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 240],
          [260, 240],
          [260, 130],
          [580, 130],
          [580, 330],
          [400, 330],
          [400, 500],
          [560, 500],
        ],
      },
      {
        id: 'b',
        goalId: 'g2',
        points: [
          [1460, 480],
          [1020, 480],
          [1020, 590],
          [700, 590],
          [700, 390],
          [880, 390],
          [880, 220],
          [740, 220],
        ],
      },
    ],
    goals: [
      { id: 'g1', at: [560, 500], tier: 2, label: '南垒' },
      // 北垒往东挪：与 a 路的纵向段拉开距离，两条路才不会并成一条
      { id: 'g2', at: [740, 220], tier: 2, label: '北垒' },
    ],
    towerSpots: [
      [140, 340],
      [400, 210],
      [700, 110],
      [900, 110],
      [1140, 340],
      [820, 480],
      [500, 620],
      [280, 440],
      [520, 420],
      [650, 300],
    ],
    cratePositions: [
      [320, 600],
      [1060, 290],
      [600, 670],
    ],
  },

  // 9 · 长征分岔：前缀占全程 72%，晚分岔两路各奔一座角楼
  {
    levelIndex: 9,
    name: '长征分岔',
    shape: islandShapeFor(9),
    bushSeed: 20260827,
    bushCount: 14,
    paths: [
      {
        id: 'a',
        goalId: 'g1',
        points: [
          [-180, 360],
          [200, 360],
          [200, 540],
          [520, 540],
          [520, 220],
          [760, 220],
          [760, 120],
          [1000, 120],
          [1100, 250],
        ],
      },
      {
        id: 'b',
        goalId: 'g2',
        points: [
          [-180, 360],
          [200, 360],
          [200, 540],
          [520, 540],
          [520, 220],
          [760, 220],
          [900, 360],
          [900, 560],
          [1040, 580],
        ],
      },
    ],
    goals: [
      { id: 'g1', at: [1100, 250], tier: 2, label: '北角楼' },
      { id: 'g2', at: [1040, 580], tier: 2, label: '南角楼' },
    ],
    towerSpots: [
      [140, 250],
      [320, 440],
      [360, 640],
      [400, 300],
      [640, 400],
      [640, 120],
      [900, 200],
      [1000, 320],
      [1140, 350],
      [860, 660],
    ],
    cratePositions: [
      [300, 120],
      [700, 620],
      [1120, 480],
    ],
  },
];

export function getLevelMap(index: number): LevelMapDef {
  const map = LEVEL_MAPS.find((m) => m.levelIndex === index);
  if (!map) throw new Error(`unknown level map: ${index}`);
  return map;
}
