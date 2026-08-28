# 大地图关卡解锁（Kingdom Rush 式）

## Why

当前关卡选择是一个扁平的 3×3 网格：所有关卡一次性铺开，孩子看到的只是一堆同样大小的卡片，缺少"我正在冒险走到哪儿"的推进感，也看不出词包是随关卡逐步变难的。家长（用户）希望参照 Kingdom Rush 的做法——一张能拖动的大地图，通关一关才解锁下一关，词包与难度自动随关卡升级，让"学完这一包就能往前走一步"这件事在空间上看得见。

同时，现有 `PackSelectView` 是纯 DOM 网格，与已经 three.js 化的战斗场景风格割裂；进入关卡前也没有任何确认环节，孩子容易误触直接进关。

## What Changes

- 用 3D 微缩岛屿大地图替换 DOM 网格选关页：一条蜿蜒的踏脚石路径把 9 座岛屿串起来，每座岛上有与该关词包呼应的低模地标（草地小动物、学校、医院、动物园、果园、舞台、宠物乐园等）。
- 岛屿三种状态：已通关（金色旗帜 + 星星）、当前关（金色脉冲光环）、锁定（地标替换为锁图标 + 整体去饱和）。点锁定岛会抖动锁并提示"先通过第 N 关吧！"。
- 点击岛屿先弹 Kingdom Rush 风格的信息卡（关卡名、词包 emoji 与名称、难度 💪、已得星星、开始/关闭），确认后才进关。
- 通关回到地图时播放解锁动画：相机平移到新解锁的岛 → 已通关的岛弹跳 → 踏脚石逐颗亮起 → 新岛从灰变彩并升起地标 → 星星点亮 + "新关卡解锁！"提示条。
- 相机可拖动平移（带边界收敛），进入地图时自动对准当前关卡；所有关卡标签是锚定在岛屿屏幕坐标上的 DOM 层，跟随相机移动并在滑出画面时隐藏。
- 渲染底座支持"多视图"：战斗场景与大地图各持一个 scene/camera，由同一个 renderer 与动画循环按当前视图渲染，拾取射线跟随切换。
- 通关进度收敛到独立模块 `src/data/progress.ts`（可注入存储，便于测试与将来换持久化方式）。
- 删除 `src/ui/PackSelectView.ts` 与对应 `.pack-*` 样式；结算按钮由"选词包"改为"返回地图"。

## Impact

- 新增规格：`world-map`（大地图的地图布局、状态、交互与解锁表现）。
- 修改规格：`level-progression`（解锁推进从网格卡片改为地图节点）、`pack-selection`（关卡选择界面改为 3D 大地图 + 信息卡）、`render-3d-scene`（多视图渲染与地图相机）、`dom-ui-layer`（锚定式地图标签层与关卡信息卡）。
- 影响代码：新增 `src/data/mapLayout.ts`、`src/data/progress.ts`、`src/world/WorldMap.ts`、`src/world/mapProps.ts`、`src/ui/WorldMapView.ts`、`tests/mapLayout.test.ts`、`tests/progress.test.ts`；修改 `src/world/IslandScene.ts`、`src/world/RaycastPicker.ts`、`src/world/terrain.ts`、`src/game/Game.ts`、`src/game/LevelController.ts`、`src/ui/StarResultView.ts`、`src/ui/styles.css`；删除 `src/ui/PackSelectView.ts`。
- 既有 localStorage 进度键（`vorush.clear.<levelId>`、`vorush.records.<packId>`）保持不变，已通关记录无需迁移。
