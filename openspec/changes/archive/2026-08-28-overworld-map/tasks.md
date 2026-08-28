## 1. 渲染底座改造

- [x] 1.1 `IslandScene` 增加 `views` / `setView(scene, camera)` / `registerCamera(camera)` / `activeCamera`
- [x] 1.2 渲染循环改为渲染 `this.view ?? 战斗视图`，`projectToScreen` 与 `onResize` 跟随 `activeCamera`
- [x] 1.3 `IslandScene.onFrame(cb)` 返回 disposer，避免重玩时回调叠加
- [x] 1.4 `RaycastPicker` 增加 `setCamera(camera)`，地图模式下射线用地图相机

## 2. 地图数据层

- [x] 2.1 新增 `src/data/mapLayout.ts`：`MapNode` / `MapTrail` / `NODE_TABLE` / `fallbackNode` / `buildMapLayout`
- [x] 2.2 实现 `nodeState` / `currentLevelIndex` / `newlyUnlocked` / `layoutBounds` / `buildStones`
- [x] 2.3 新增 `src/data/progress.ts`：`ProgressStorage` 注入 + `readClear` / `writeClear` / `clearedLevelIds` / `starCount`
- [x] 2.4 单测 `tests/mapLayout.test.ts`（9 例）与 `tests/progress.test.ts`（5 例）

## 3. 3D 地图场景

- [x] 3.1 `terrain.ts` 增加 `createMapIsland(seed, radius)` 与 `createMapReflection`
- [x] 3.2 新增 `src/world/mapProps.ts`：地标基元与 `LANDMARK_RECIPES`、`makeLandmark` / `makeLock` / `makeSteppingStone` / `makeCurrentRing` / `makeBanner`
- [x] 3.3 新增 `src/world/WorldMap.ts`：岛屿组、踏脚石 `InstancedMesh`、状态切换（锁定/当前/已通关）、拖拽平移与拾取
- [x] 3.4 `applyState` 与 `setGrey`：锁定岛去饱和 + 锁图标，当前岛金色脉冲光环，已通关岛旗帜

## 4. DOM 层与样式

- [x] 4.1 新增 `src/ui/WorldMapView.ts`：锚定标签层、KR 式关卡信息卡、提示条、`popStars`
- [x] 4.2 `src/ui/styles.css` 删除 `.pack-*`，新增地图层样式（标签、卡片、toast、星星弹跳动画）
- [x] 4.3 地图层 `pointer-events` 透传（`#ui > *` 默认 auto，需更高优先级覆盖）

## 5. 流程接线

- [x] 5.1 `Game` 改为 开始 → 大地图 → 单局 → 返回地图 的循环
- [x] 5.2 `onTapNode` 走信息卡确认；锁定节点抖动锁 + toast
- [x] 5.3 `LevelController` 复用 `writeClear`，`dispose()` 里停帧回调并关闭结算面板
- [x] 5.4 `StarResultView` 增加 `close()`，按钮由"选词包"改为"返回地图"
- [x] 5.5 删除 `src/ui/PackSelectView.ts`

## 6. 解锁动画

- [x] 6.1 `WorldMap.playUnlock(index)`：相机平移 → 已通关岛弹跳 → 踏脚石点亮 → 新岛去灰升地标
- [x] 6.2 `Game.onLevelExit` 用 `newlyUnlocked` 计算待解锁节点，回到地图后播放
- [x] 6.3 星星点亮 `popStars` + "新关卡解锁！"提示条

## 7. 验证与归档

- [x] 7.1 `npx tsc --noEmit` 通过
- [x] 7.2 `npx vitest run` 全绿（44 例，含新增 14 例）
- [x] 7.3 `npm run build` 通过
- [x] 7.4 浏览器冒烟：地图 9 座岛与标签渲染、点击弹卡、锁定节点提示、进入关卡
- [x] 7.5 浏览器冒烟：自动打通第 1 关 → 返回地图 → 第 2 关解锁且进度持久化
- [x] 7.6 同步 delta 规格到 `openspec/specs/` 并归档本 change
