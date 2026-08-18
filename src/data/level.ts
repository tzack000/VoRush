/** 1-1 关卡地图数据：路径拐点、塔位、补给箱出现位（逻辑分辨率 1280×720）。 */
export const PATH_POINTS: ReadonlyArray<readonly [number, number]> = [
  [-40, 600],
  [240, 600],
  [240, 240],
  [560, 240],
  [560, 520],
  [880, 520],
  [880, 160],
  [1320, 160],
];

export const TOWER_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [140, 480],
  [340, 620],
  [340, 140],
  [460, 340],
  [660, 620],
  [660, 420],
  [800, 620],
  [980, 260],
];

/** 补给箱可能出现的位置（避开路径与塔位） */
export const CRATE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [1180, 600],
  [80, 80],
  [1180, 320],
];
