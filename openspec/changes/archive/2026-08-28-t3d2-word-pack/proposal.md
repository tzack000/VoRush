# 新增 T3D2 词包与第 9 关

## Why

学校发放的 `00_input/Dict_P1_T3.pdf` 已于 2026-08-28 更新，补齐了 Dictation 2 的词汇表（Unit 6 Playing with pets + Fun Spelling 'd'）。当前词库止于 T3D1，只能支撑 8 关；孩子的默书进度会继续往后走，需要把新词表纳入游戏，避免出现"学到第 9 周没关可打"的断档。

（注：PDF 第 3 页为空白页，T3 Dictation 3 词表尚未发放，本次不纳入。）

## What Changes

- 词库新增词包 `t3d2`（T3 默书 2 · 宠物朋友），11 个单词：goldfish、hamster、parrot、rabbit、run、talk + Fun Spelling 'd' 的 date、dish、doctor、door、dress。
- 关卡序列追加第 9 关绑定 `t3d2`，沿用既有难度缩放公式（hpMult 2.2、speedMult 1.32、countBonus 4），第 9 关需通关第 8 关后解锁。
- 为 10 个新词生成 m4a 发音（rabbit 已在 T2D2 生成，直接复用）。
- 单测补充：词库完整性覆盖 t3d2，关卡序列断言 9 关且第 9 关为 t3d2。

## Impact

- 影响规格：`word-library`（学校默书词包内容）、`level-progression`（关卡序列与词包绑定）。
- 影响代码：`src/data/words.ts`、`src/data/levels.ts`、`tests/wordLibrary.test.ts`、`tests/levels.test.ts`、`public/assets/audio/words/`。
- 不涉及战斗/UI/经济系统改动；已有 8 关的学习记录与通关状态不受影响（按词包 id 隔离）。
