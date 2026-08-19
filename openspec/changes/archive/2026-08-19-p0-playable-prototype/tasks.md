# P0 可玩原型实施任务

## 1. 工程脚手架

- [x] 1.1 初始化 Vite + TypeScript 工程（package.json、tsconfig、vite.config），安装 phaser、vitest
- [x] 1.2 创建 `src/main.ts`：Phaser 配置（1280×720、Scale.FIT、横屏）、BootScene/LevelScene 注册
- [x] 1.3 BootScene：加载 data 配置与占位资源，进入 LevelScene
- [x] 1.4 目录结构按 design D10 建立；`npm run dev` 能打开空白游戏画面

## 2. 数据配置层（src/data/）

- [x] 2.1 `words.ts`：cat/dog/bird/fish 四词定义（词形、emoji 图、音频 key）
- [x] 2.2 `economy.ts`：金币数值表（初始 120、首对 25、次对 20、提示 15、补给箱 10~15、塔价与升级费）
- [x] 2.3 `towers.ts`：弓箭塔/骑士营地三级属性、射程、价格、儿童提示语
- [x] 2.4 `waves.ts`：敌人属性（哥布林/野狼/哥布林队长）与 3 波出怪序列、出口生命

## 3. 学习与经济核心逻辑（纯 TS，可单测）

- [x] 3.1 `learning/WordRecord.ts`：每词学习记录（尝试、独立答对、提示完成、分题型记录），localStorage 快照读写（try/catch 降级内存）
- [x] 3.2 `learning/QuestionSelector.ts`：选题优先级（新词 → 最近答错 → 单一题型词）
- [x] 3.3 `economy/GoldWallet.ts`：金币增减、按答题结果发放（首对/次对/提示）
- [x] 3.4 vitest 单测：金币发放规则、三星判定、选题优先级

## 4. 战斗系统（combat/）

- [x] 4.1 地图与路径：程序生成草原地块/路径贴图，`Phaser.Curves.Path` 定义出怪路线，塔位标记
- [x] 4.2 `Enemy`：沿路径移动、生命、到达出口扣血、被击败播放逃跑/消失动画
- [x] 4.3 `WaveSpawner`：按 waves.ts 序列出怪，波次结束回调
- [x] 4.4 `ArcherTower`：建造、索敌、投射物攻击、三级升级与外观变化
- [x] 4.5 `KnightCamp`：派出骑士拦截路径上的敌人、交战、撤退与定时返回
- [x] 4.6 出口生命 HUD 与失败判定

## 5. 答题界面（quiz/）

- [x] 5.1 `WordAudio`：发音播放接口（占位用 speechSynthesis，预留 mp3 切换）
- [x] 5.2 `QuizOverlay`：通用答题层（题面区 + 4 个 ≥60pt 选项 + 语音重播按钮），打开时暂停 combatTime
- [x] 5.3 听音选图题型：播放发音 + 4 张 emoji 图选项（1 正 3 误取自本关词）
- [x] 5.4 看图选词题型：emoji 图题面 + 4 个词卡选项
- [x] 5.5 答错流程：温和反馈（抖动/变暗）→ 二次错给高亮提示 → 提示完成；全程无倒计时、无红叉

## 6. 单局流程与 UI（session/ + ui/）

- [x] 6.1 `SessionStateMachine`：PRE_TEACH → BUILD(0) → [PRACTICE → BUILD → COMBAT]×3 → SETTLE/FAIL
- [x] 6.2 战前认识：4 词依次展示（图 + 发音 + 词形）
- [x] 6.3 布防阶段：建塔菜单（价格 + 提示语 + 预览，无数值）、升级交互、开始波次按钮
- [x] 6.4 波间固定练习：每波前 4 道题（题型由 QuestionSelector 决定），完成后发金币进入布防
- [x] 6.5 `ui/Button` 通用组件（≥60pt）、金币 HUD
- [x] 6.6 首次教学引导：语音/高亮/手势动画，每次只教一个操作；重玩跳过

## 7. 补给箱事件（events/）

- [x] 7.1 `SupplyCrate`：战斗中随机出现在战场旁（图标 + 提示音），每波至多 1 个，不遮挡战斗
- [x] 7.2 点击打开 QuizOverlay（暂停战斗），完成发 10~15 金币；超时未点自动消失且无惩罚

## 8. 结算

- [x] 8.1 三星判定：通关星/认识星/复习星（按 level-session 规格）
- [x] 8.2 结算界面：星星展示 + 重玩入口；失败结算保留学习记录、提供重试

## 9. 打磨与验收

- [x] 9.1 占位音效接入（答对、提示、建造、攻击），开始按钮手势内解锁 AudioContext
- [x] 9.2 iPad Safari 真机/模拟器走查：横屏、触控区域、音频播放、单局约 8 分钟
- [x] 9.3 `npm run build` 通过，vitest 全绿，按 specs 逐条场景核对验收
