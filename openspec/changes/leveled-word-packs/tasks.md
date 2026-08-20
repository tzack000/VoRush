# 词包分级与关卡递进实施任务

## 1. 关卡数据与缩放

- [x] 1.1 `src/data/levels.ts`：LevelDef/DifficultyScale、8 关定义（index→packId→scale）
- [x] 1.2 `scaleWaves`/`scaleEnemy` 纯函数 + `isLevelUnlocked` 纯函数
- [x] 1.3 vitest：缩放正确性（第 1 关恒等、后关递增）、解锁规则

## 2. 关卡选择页

- [x] 2.1 PackSelectView 改关卡页：LEVELS 数据源、序号角标、星星、🔒 锁定置灰不可点

## 3. 单局接入

- [x] 3.1 LevelController 接收 LevelDef：绑定词包自动加载、波次按 scale 缩放、通关写 clear 标记
- [x] 3.2 Game 接线：关卡页 → startLevel(level)

## 4. 验证

- [x] 4.1 `tsc` + vitest 全绿，`npm run build` 通过
- [x] 4.2 浏览器冒烟：锁定态、通关解锁下一关、后关敌人生命更高、控制台零错误
