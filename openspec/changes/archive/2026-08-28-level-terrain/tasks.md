## 1. 地形基座

- [x] 1.1 `coords.ts` 参数化：`IslandShape` + 纯函数 `islandHeightWith` + 模块级 `setIslandShape/activeIslandShape/resetIslandShape`，`islandHeight` 签名不变
- [x] 1.2 `tests/coords.test.ts`：与旧硬编码公式逐点一致（防回归）、set/reset 行为
- [x] 1.3 `dispose.ts` 的 `disposeObject`：递归释放 geometry + 非共享材质（跳过 `userData.shared`）
- [x] 1.4 `models.ts` / `mapProps.ts` 材质缓存打 `shared` 标
- [x] 1.5 `IslandScene` 拆 `buildTerrain/clearTerrain`，倒影只释放材质、灌木按关卡种子重撒；`terrainReady` 断言
- [x] 1.6 `terrain.createIsland` 收多条路径（共享前缀重复着色幂等）

## 2. 地图数据

- [x] 2.1 `levelMaps.ts`：`Pt2/GoalDef/LanePathDef/LevelMapDef` + `islandShapeFor`（radiusX 恒 26）+ 9 张手写地图 + `getLevelMap`
- [x] 2.2 `LevelDef` 挂 `map` 字段；删除 `src/data/level.ts`，改 4 处 import；`SupplyCrate` 接收箱位参数
- [x] 2.3 出怪口外推到对全部海岸线稳健的位置（x=±180/1460、y=-200）
- [x] 2.4 `tests/levelMaps.test.ts`：12 组断言（平台/视野/间距/塔位质量/等长/形状快照…）

## 3. 多路径运行时

- [x] 3.1 `Path.pointAt(dist, lateral)` + `tangentAt`（横向偏移 ≤8px 打散共享前缀重叠）
- [x] 3.2 `Enemy` 持有 `path/goalId/lateral` 与 `get remaining`；`updateEnemy` 去掉 path 参数
- [x] 3.3 `ArcherTower` 索敌优先级改 `remaining`（跨路径可比）
- [x] 3.4 `LaneBag` 洗牌袋（copies=2, maxStreak=2）+ `tests/laneBag.test.ts`
- [x] 3.5 `LevelController`：`path → lanes`、`nearestPathPoint` 全路径就近、`createGoals/goalFacing/punchGoal`
- [x] 3.6 `dispose()` 清理哨站并对敌人/塔/旗/盘做 `disposeObject`
- [x] 3.7 `tests/path.test.ts`：弧长/横向偏移/共享前缀重合/共享后缀重合

## 4. 顺带修复

- [x] 4.1 `waves.ts` captain 组 `intervalMs: 0 → 1200`
- [x] 4.2 `levels.ts` `scaleWaves` 只对 `count > 1` 的组加成（队长恒 1 只）
- [x] 4.3 `tests/waves.test.ts`：队长数量、第 9 关第 3 波时间戳互不相同

## 5. 验证

- [x] 5.1 `npx tsc --noEmit` 通过
- [x] 5.2 `npx vitest run` 全绿（79 例，新增 28 例）
- [x] 5.3 `npm run build` 通过
- [x] 5.4 浏览器断言：地形 UUID 每关不同（5 关实测）；路径/哨站数量符合爬升曲线
- [x] 5.5 浏览器断言：iPad 比例下全部塔位与哨站屏幕坐标在视口内
- [x] 5.6 浏览器断言：进出关卡 `sceneChildren` 一致（40→失败→返回→再进→40），无 mesh 泄漏
- [x] 5.7 浏览器断言：共享血池 lives 6→0、哨站 breached 同步递增；双路分怪 3:4 均衡
- [x] 5.8 浏览器断言：新地图上建塔链路（弹窗→卡片→扣款 120→20→towers=1）
- [x] 5.9 浏览器冒烟：完整通关一遍（塔射击/骑士/结算）

## 6. 规格与归档

- [x] 6.1 新增 `level-terrain` 规格，MODIFY `tower-defense-combat` / `level-progression` / `render-3d-scene`
- [x] 6.2 同步 delta 规格到 `openspec/specs/` 并归档本 change
