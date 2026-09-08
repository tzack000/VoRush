## 1. 学习记录成长字段

- [x] 1.1 `WordBook` 增加 `strength` / `lastReviewedAt`，缺字段兼容读取；`recordAnswer` 推进或重置熟练度（验证：旧 JSON 不丢答题历史）
- [x] 1.2 导出 `bookKey(packId)`，`LevelController` 改为使用它（验证：键名仍为 `vorush.records.<packId>`）

## 2. 间隔选题与进度

- [x] 2.1 新增 `ReviewSelector`：收集已通关已学词、到期判定、优先级选题（验证：`tests/reviewSelector.test.ts`）
- [x] 2.2 `progress.ts` 增加 `vorush.review` 读写与完成累加（验证：`tests/progress.test.ts` 新用例）
- [x] 2.3 `tests/wordBook.test.ts` 覆盖熟练度升降与旧记录兼容（验证：相关用例全绿）

## 3. 复习会话与地图入口

- [x] 3.1 新增 `ReviewSession`：加载已通关词包、出 6 题、复用 `QuizOverlay`、不发金币、写记录与完成面板
- [x] 3.2 `WorldMapView` 通关后显示复习按钮与到期红点，确认卡可开始/关闭
- [x] 3.3 `Game` 接入入口与 `__vorush.reviewInfo` 调试钩子；`QuizOverlay` 支持可选标题
- [x] 3.4 复习按钮/确认卡/完成面板样式，触控区 ≥60pt

## 4. 规格与文档

- [x] 4.1 把 delta 手动同步到 `openspec/specs/`（含新建 `review-patrol`），`npx openspec validate --specs` 13 份全过
- [x] 4.2 更新 `AGENTS.md` 不变量 8 与规格数量；README 玩法循环补上复习巡逻
- [x] 4.3 `npx tsc --noEmit`、`npx vitest run`、`npm run build` 全绿后归档本 change
