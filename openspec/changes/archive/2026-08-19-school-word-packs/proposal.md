# 学校默书词包与多关卡

## Why

P0 原型已完成并归档。用户提供了孩子所在学校（保良局何寿南小学 P.1）2025-2026 三个学期的真实默书词表（00_input/Dict_P1_T1~T3.pdf），这些是孩子当前真正需要掌握的词。游戏词库需从单一动物主题扩展为**多词包结构**，录入学校默书包，并让每个词包成为一个可完整游玩的关卡（词包选择 → 完整三波会话）。

## What Changes

- 词库重构为多词包数据结构：保留动物主题包（cat/dog/bird/fish），新增 7 个学校默书包（T1D1~T1D3、T2D1~T2D3、T3D1，含各包 Fun Spelling 词）
- 多词短语提取核心词作为学习对象（如 "a monitor"→monitor、"eleven peaches"→peaches、"two feet"→feet）
- 每个词配 emoji 语义图（无天然 emoji 的词用近似图标）与 m4a 发音（沿用 macOS say 批量生成管线）
- 新增词包选择界面：开始界面后进入词包网格，展示各包名称、emoji 与已获得星星；选择后进入完整单局（战前认识→布防→三波→结算）
- 学习记录按词包隔离（localStorage 键含包 id）；结算后可返回词包选择
- 答题干扰项从当前词包内取（原实现固定取 4 个动物词）
- 战斗/塔/敌人/经济规则不变（数值沿用，不在本范围调整）

明确不做：T3 D2/D3 词表（PDF 中未包含，需用户提供）；关卡解锁递进与王国地图视觉（P1 另行规划）；间隔复习调度；字母排序等新题型。

## Capabilities

### New Capabilities

- `word-library`: 多词包数据结构（WordPack/WordDef）、学校默书 7 包内容定义、核心词提取规则、emoji 配图、m4a 音频资产
- `pack-selection`: 词包选择界面——词包网格（名称/emoji/星星）、进入关卡、结算后返回；学习记录按包隔离存取

### Modified Capabilities

- `word-learning`: 题目生成改为从当前词包取词与干扰项（原固定动物词表）
- `level-session`: 单局由选中的词包驱动；战前认识、选题、补给箱出题、三星判定均使用包内词；学习记录按包持久化

## Impact

- 数据：`src/data/words.ts` 重构为词库（包定义）；新增 `public/assets/audio/words/*.m4a` 约 50 个音频
- 代码：questionGenerator、WordBook（存储键）、LevelController（包注入）、Game/开始界面（包选择）改动；战斗与 UI 组件基本不动
- 测试：现有单测引用动物词表，需更新为词库 API；新增词库完整性测试（每词有 emoji/音频文件）
- 兼容：旧 localStorage 记录（动物包）迁移到包隔离键
