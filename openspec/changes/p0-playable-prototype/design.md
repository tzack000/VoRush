# P0 可玩原型技术设计

## Context

空仓库，从零搭建。产品：学习优先的儿童英语塔防，目标用户为小学一、二年级，首发 iPad 横屏。已确认范围（P0：仅 1-1 草原哨站）与技术栈（Web，TypeScript + Phaser）。玩法与数值以《VoRush 核心玩法设计 v0.1》为准，requirements 见本 change 的 specs/。

关键约束：
- 触控优先：无系统键盘，点击/点选为主；主要按钮 ≥60pt；固定横屏。
- 答题时战斗**完全暂停**；事件不强制打断。
- 不惩罚答错、无倒计时、无速度奖励、无刺耳音效/红叉。
- 数值均为"待试玩校准"的初始参考值 → 必须数据驱动，便于调整。

## Goals / Non-Goals

**Goals:**
- 一套可在 iPad 浏览器（Safari）直接试玩的单关卡原型，`vite dev` / 静态部署即可运行。
- 完整单局状态机：战前学习 → 布防 → 3×（波间练习 → 布防 → 战斗）→ 结算（含三星）。
- 答题/学习记录、金币、波次、塔、敌人全部数据驱动（JSON/TS 配置），数值调参不改逻辑。
- 占位美术与 TTS/录音音频，界面达到"可给儿童试玩"的完成度。

**Non-Goals:**
- 不做 P1 内容（英雄、字母排序、另外两种塔、Boss、王国地图、工坊、复习巡逻）。
- 不做账号/云存档；学习记录仅存 localStorage（单局维度即可，成长状态持久化属 P1）。
- 不做性能深度优化、自动化 E2E 测试、CI 发布流程。
- 不做正式美术与专业配音。

## Decisions

### D1: Phaser 3 + Vite + TypeScript，无额外框架
- 选 Phaser 3（非 Phaser 4 beta）：生态与文档成熟，2D 塔防所需（Sprite、Tween、路径跟随、音频、输入）开箱即用。
- UI 直接用 Phaser GameObject（Container + 自绘按钮组件），**不引入 React/DOM UI**——避免两套输入/缩放体系，暂停语义也更统一。
- `phaser` 单依赖；不引入状态管理库（单局状态量小，自管理足够）。

### D2: 场景划分与单局状态机
场景（Scene）：
- `BootScene`：加载配置与资源。
- `LevelScene`：唯一游戏场景，承载 1-1 全部环节（单关卡，无需拆分战斗/地图场景）。
- `QuizOverlay`（LevelScene 内的 UI 层，非独立 Scene）：所有题型共用的答题界面。

单局流程用显式状态机驱动（普通 TS 类，非库）：
`PRE_TEACH → BUILD(0) → [PRACTICE(i) → BUILD(i) → COMBAT(i)]×3 → SETTLE | FAIL`
每个状态有 enter/exit，波次索引驱动。理由：环节固定且线性，状态机比事件散播更易读、易在失败时安全重置。

### D3: 暂停架构——单一 timeScale 闸口
"答题时完全暂停战斗"通过**暂停战斗逻辑层**实现：战斗相关对象（敌人移动、塔攻击、出怪计时）统一挂在 `combatTime` 计时器下，答题/教学时将 `combatTime.paused = true`，UI 层独立计时不受影响。
- 备选：暂停整个 Scene（`scene.pause`）会连 UI 动画一起停掉，答题界面无法工作，否决。
- 补给箱事件同理：点击图标 → 打开 QuizOverlay 并置暂停 → 完成后恢复。

### D4: 全部数值数据驱动
`src/data/` 下 TypeScript 配置即数据：
- `words.ts`：4 词 ×（词形、图片 key、音频 key、已出题记录结构）。
- `economy.ts`：金币表（初始 120、首对 25、次对 20、提示 15、补给箱 10~15、塔价 100/100、升级费）。
- `waves.ts`：3 波出怪序列（种类、数量、间隔）、敌人属性、出口生命。
- `towers.ts`：两塔三级属性、射程、提示语。
调参只改这些文件。理由：设计文档明确"待试玩校准"，硬编码数值会拖慢试玩迭代。

### D5: 学习记录模型（单局内存 + localStorage 快照）
每词记录：四种能力维度中 P0 用到两项（词义辨认、听音辨认）的尝试次数、是否独立答对、各题型独立答对集合。用于：
- 结算三星判定（认识星/复习星定义见 level-session 规格）；
- 选题优先级简化版（P0：优先本关新词 → 最近答错词 → 只在单一题型答对的词）。
持久化仅写 localStorage 以便失败后重试不丢记录；跨天复习调度属 P1，不做。

### D6: 出题与引导逻辑
两种题型共用 QuizOverlay：
- 听音选图：播放发音 → 4 张图片选项（1 正 3 误，误项取自本关其余词）。
- 看图选词：展示图片 → 4 个词卡选项。
答错：温和反馈（选项抖动/变暗 + 可重播语音），第二次错给提示（高亮正确项/引导点击），提示完成按"提示完成"发 15 金币。一屏最多 4 选项，选项按钮 ≥60pt。

### D7: 音频方案
- 单词发音：预录 mp3 放 `assets/audio/words/{cat,dog,bird,fish}.mp3`；**占位期**用 Web Speech API（`speechSynthesis`，en-US）运行时合成，接口与预录一致（`WordAudio.play(wordId)`），后续替换为文件播放不改调用方。
- 音效：少量占位音（答对、提示音、建造、塔攻击），音量温和，无失败刺耳音。
- iOS Safari 限制：首次用户手势后才能出声——在开始界面"开始"按钮的点击回调中初始化/解锁 AudioContext。

### D8: 美术方案——程序生成占位
用 Phaser Graphics 预生成贴图（色块+简单形状的卡通风格：塔、敌人、补给箱、路径、地块），单词图片用 emoji 文本渲染（🐱🐶🐦🐟）——零外部素材依赖，风格统一为明亮卡通，满足"不血腥"（敌人被击败做缩小/跳走 tween）。

### D9: 适配与输入
- `Phaser.Scale.FIT` + 固定逻辑分辨率 1280×720（16:9 横屏），居中；`orientation: landscape` 锁定提示。
- 输入仅 `pointerdown`（点选），不做拖拽（设计允许字母卡点选，P0 无字母题）。
- 按钮组件统一最小 60×60 逻辑像素（FIT 缩放下 iPad 上 ≥60pt）。

### D10: 工程结构
```
src/
  main.ts            # Phaser 配置入口
  scenes/BootScene.ts, LevelScene.ts
  session/SessionStateMachine.ts
  combat/ (Enemy, Tower, ArcherTower, KnightCamp, Path, WaveSpawner)
  quiz/ (QuizOverlay, questionGenerator, WordAudio)
  economy/GoldWallet.ts
  learning/WordRecord.ts, QuestionSelector.ts
  events/SupplyCrate.ts
  ui/ (Button, GoldHud, HeartsHud, StarResultView)
  data/ (words, economy, waves, towers)
```
逻辑层（learning/economy/session/quiz 生成器）与 Phaser 解耦，纯 TS 可用 vitest 单测（仅对三星判定、金币发放、选题优先级写少量测试）。

## Risks / Trade-offs

- [Web Speech API 在 iPad Safari 的儿童语音质量与可用性不稳定] → 接口隔离（D7），试玩前替换为预录 mp3 只需换实现；预留音频文件目录。
- [占位美术影响儿童试玩反馈的真实性] → P0 验证的是"学习-塔防循环"而非美术，风险可接受；emoji 单词图保证语义清晰。
- [Phaser 无内置寻路/塔防组件，全部手写] → P0 仅一条固定路径+两种塔，工作量可控；路径用 `Phaser.Curves.Path`。
- [localStorage 在 iPad 隐私模式下不可用] → 用 try/catch 包裹，失败降级为纯内存（单局功能不受影响）。
- [单场景承载全部环节可能膨胀] → 通过 session/combat/quiz 分层控制；若 P1 扩展再拆场景。
- [无自动化 E2E，回归靠手测] → P0 可接受；核心判定逻辑用 vitest 覆盖。

## Migration Plan

空仓库，无迁移。交付物即初始代码库：`npm install && npm run dev` 可玩；`npm run build` 产出静态站点。

## Open Questions

- 单词发音最终用真人录音还是 TTS 成品音？（试玩前需确认，接口已隔离）
- 波间练习的 4 题/轮是否适合一二年级注意力？（试玩校准项，配置可调）
- 哥布林队长的数值定位（血量/速度）需在首次内部试玩后调整。
