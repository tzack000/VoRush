# 大地图关卡解锁 · 设计

## Context

关卡选择目前是 `PackSelectView` 渲染的 DOM 网格（3×3 卡片）。它解决了"选关"的功能问题，但有三个已确认的痛点：

1. 缺少推进感——9 张卡片一次性铺开，看不出"走到哪儿了"。
2. 与已 three.js 化的战斗场景风格割裂（一个 DOM 网格 + 一个 3D 战场）。
3. 点击即进关，没有确认环节，孩子容易误触。

战斗渲染已经稳定运行（`IslandScene` + `RaycastPicker` + `Tweens`），本 change 的目标是在不改动战斗逻辑的前提下，把"选关"也搬进 3D，并加上 Kingdom Rush 式的解锁推进与信息卡确认。

## Goals / Non-Goals

**Goals**

- 一张可拖动的 3D 微缩岛屿大地图，通关一关解锁下一关。
- 点击岛屿先弹信息卡，确认后才进关。
- 通关回到地图时有一次看得见的解锁动画 + 星星点亮。
- 词包与难度随关卡自动升级（已由 `level-progression` 保证，本 change 只负责在地图上呈现）。
- 地图相关的布局与解锁判定是纯数据/纯函数，可单测。

**Non-Goals**

- 不做相机旋转/缩放（延续"锁视角避免儿童误操作"的既有决定）。
- 不做分支路线、隐藏关卡、关卡内购买等 KR 完整系统。
- 不引入外部模型/贴图，地标继续用 three.js 基础几何体拼装。
- 不做后端/账号同步，进度继续放 localStorage。
- 不改变战斗、经济、学习系统的任何数值与规则。

## Decisions

### 1. 两个 scene/camera 共用一个 renderer

战斗场景与大地图各持自己的 `THREE.Scene` 与 `PerspectiveCamera`；`IslandScene` 增加：

- `registerCamera(camera)` —— 登记需要同步视口尺寸的相机
- `setView(scene, camera)` —— 切换当前渲染视图（传 `null, null` 回到战斗视图）
- `activeCamera` —— 供屏幕投影 / 射线拾取使用
- `onFrame(cb)` —— 返回 disposer 的帧回调注册

**Why**：`LevelController` 里有约 20 处 `island.scene` 的引用，把地图物体塞进同一个 scene 会污染战斗场景（光照、水面、拾取目标）；而为每个视图单独开一个 WebGLRenderer 在 iPad 上是明确的显存与上下文开销。共用一个 renderer + 一个 `setAnimationLoop` 是最小改动且性能安全的方案。

**Alternative rejected**：把地图塞进战斗 scene 并用 `visible` 切换——会让战斗的 Raycaster 打到地图物体，且每帧遍历开销不可控。

### 2. 地图布局是纯数据，与 three.js 完全解耦

`src/data/mapLayout.ts` 不 import three.js，导出：

- `MapNode { index, levelId, packId, x, z, radius, landmark }`
- `MapTrail { from, to, stones }`（stones 为踏脚石坐标数组）
- `buildMapLayout(levels)` —— 含相机参数 `{ height, distance, lookAtY, fov }`
- `nodeState(nodes, index, cleared)` → `'locked' | 'current' | 'cleared'`
- `currentLevelIndex` / `newlyUnlocked` / `layoutBounds`

节点坐标来自手调的 `NODE_TABLE`（按词包 id 索引，9 关）；词包新增而表中没有时用 `fallbackNode` 蛇形排布兜底，保证"加词包不会崩"。

**Why**：解锁推进是核心规则，必须能单测；坐标调参也要能脱离渲染反复试。

### 3. 进度读写收敛到 `src/data/progress.ts`

`ProgressStorage` 接口（默认 `localStorage`）注入，`readClear/writeClear/clearedLevelIds/starCount`。原先 `clearKey()` 是 `LevelController` 的私有函数，地图侧无法复用。

**Why**：地图和结算都要读同一份进度；可注入存储让单测不需要 mock `localStorage`。

### 4. 标签用 DOM 层锚定，不用 3D 文字

每帧由 `WorldMap.anchors()` 计算岛屿顶端的屏幕坐标，`WorldMapView.updateLabels()` 写入 `transform`。滑出画面的标签 `opacity: 0`。

**Why**：three.js 没有内置字体，引入 TextGeometry/字体文件与"不依赖外部资源"的原则冲突；DOM 文字在 iPad 上也更清晰、更好排版。代价是每帧 9 次 `Vector3.project`，可忽略。

### 5. 拖拽与点击靠位移阈值区分

`pointerdown` 记录起点，`pointerup` 时若总位移 < `DRAG_THRESHOLD` 像素才算点击并做射线拾取；否则视为拖拽平移相机。相机目标点用 `clampTarget()` 收敛在地图边界内。

**Why**：iPad 上儿童手指落点不精确，纯 `click` 会在拖动结束时误触发进关。

### 6. 解锁动画是编排好的一串 tween，不是视频/脚本动画

`WorldMap.playUnlock(index)`：相机平移到新岛 → 已通关岛弹跳 → 踏脚石按序亮起（`after(500 + i*70)`）→ `after(900)` 时新岛去灰（1→0）并切到 `current` 态 → 地标 `outBack` 缩放入场 → 弹跳。同时 `mapView.popStars()` 与 toast。

**Why**：沿用项目已有的 `Tweens`/`Ease` 系统，不引入新依赖；整串动画由 `Tweens.killAll()` 可中断（进关时会调用）。

## Risks / Trade-offs

- **DrawCall 增加**：9 座岛 + 地标 + 踏脚石。已用 `InstancedMesh` 承载每条路径的踏脚石，地标用共享材质；地图不与战斗同屏，战斗的性能预算不受影响。真机需在 `?debug=1` 下确认地图 FPS。
- **`island.scene` 语义变化**：现在特指战斗场景。已在 `IslandScene` 上加 `setView`/`activeCamera` 收敛，未改动 `LevelController` 内部引用。
- **帧回调泄漏**：`LevelController` 每局注册一次帧回调，重玩会叠加。已在构造函数保存 disposer 并在 `dispose()` 里调用。
- **`StarResultView` 遮罩残留**：原先被不透明的选关页背景遮住看不见，换成透明 canvas 后会暴露。已加 `close()` 并在返回地图/重玩时调用。
- **NODE_TABLE 是手调的**：新增第 10 关时若不补表，会走蛇形兜底，观感略差但不崩。
