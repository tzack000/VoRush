## 1. 取景关卡集合（纯数据）

- [x] 1.1 `mapLayout.ts` 新增 `unlockedFrameIndices(nodes, cleared)`：已解锁关卡 + 第一个锁定关卡做诱饵
- [x] 1.2 单测：0 关通关 → [1,2]；通关前两关 → [1,2,3,4]；全通 → 全部关卡
- [x] 1.3 单测：任意进度下取景集合不含跳过的锁定关卡，已解锁关卡一个不少

## 2. 相机取景求解

- [x] 2.1 `WorldMap` 增加 `zoom` 字段，`placeCamera(x, z, zoom)` / `applyCamera()` 支持拉远
- [x] 2.2 `fitView(indices)`：探针取样 + 缩放递增试算 + 投影包围盒牛顿居中
- [x] 2.3 `frameProgress(cleared, animate)`：取景并可带动画过渡
- [x] 2.4 拖拽平移的"每像素世界距离"乘上 zoom
- [x] 2.5 删除 `focusCurrent` / `panTo`

## 3. 流程接线

- [x] 3.1 `Game.enterMap` 改为调用 `frameProgress`
- [x] 3.2 `playUnlock` 的相机动作改为重新取景（保留刚通关的岛在画面内）

## 4. 验证

- [x] 4.1 `npx tsc --noEmit` 通过
- [x] 4.2 `npx vitest run` 全绿（46 例，含新增 2 例）
- [x] 4.3 `npm run build` 通过
- [x] 4.4 浏览器冒烟：0 / 3 / 8 关通关三种进度下，已解锁关卡全部在画面内
- [x] 4.5 浏览器冒烟：iPad 横屏比例（1180×820）下取景正确，全通时 zoom 2.25、岛屿约 120px（远超 60pt）
- [x] 4.6 浏览器冒烟：通关 → 返回地图 → 解锁动画把新旧两关都框进画面（相机落到 [1,2,3] 取景中心）
- [x] 4.7 浏览器冒烟：失败返回地图不解锁、无残留遮罩、相机重新取景

## 5. 规格与归档

- [x] 5.1 同步 delta 规格到 `openspec/specs/`
- [x] 5.2 归档本 change
