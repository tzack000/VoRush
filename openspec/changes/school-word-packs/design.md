# 学校默书词包技术设计

## Context

P0 + 3D 迁移已归档：单关卡（固定 4 动物词）完整可玩，词相关逻辑分布在 `data/words.ts`（硬编码 LEVEL_WORDS）、`questionGenerator`（固定干扰项池）、`WordBook`（单一存储键）、`LevelController`（ LEVEL_WORD_IDS 直连）。现需支持 8 个词包（1 动物 + 7 学校默书）与词包选择。

## Goals / Non-Goals

**Goals:**
- 词库为纯数据模块，词包可增删不改逻辑。
- 学校默书 7 包内容完整录入（核心词 + emoji + m4a）。
- 词包选择界面；每包独立学习记录与星星；结算可返回选包或重玩。
- 全部既有单测适配词库 API。

**Non-Goals:**
- 不做 T3 D2/D3（缺词表）；不做关卡解锁递进、王国地图视觉、复习调度、新题型。
- 不为短语保留完整词形（只学核心词）。

## Decisions

### D1: 词库结构——WordPack[] 纯数据
```ts
interface WordDef { id: string; text: string; emoji: string; audioKey: string }
interface WordPack { id: string; name: string; words: WordDef[] }
```
- `src/data/words.ts` 重构导出 `WORD_PACKS: WordPack[]`；`getPack(id)`、`getWord(pack, wordId)`。
- 动物包 id `animals-1`，学校包 id `t1d1`…`t3d1`，中文名（如「T1 默书 1 · 新朋友」）。
- 音频 key 即单词 id：`word_<id>`，文件 `assets/audio/words/<id>.m4a`。

### D2: 音频批量生成——脚本化
- `scripts/gen-audio.sh`：`say -v Samantha -r 145` + `afconvert` 循环词库全部 id，输出到 `public/assets/audio/words/`。词库加词时重跑。
- 新增 vitest：词库完整性（4~6 词/包、emoji 非空、音频文件存在于 public 目录——用 fs 检查）。

### D3: 出题与记录——包注入
- `generateQuestion(wordId, type, packWords, rng)`：干扰项从包内取（原 LEVEL_WORDS 硬编码删除）。
- `WordBook.load(storageKey, wordIds)` 签名不变；存储键改为 `vorush.records.<packId>`。动物包旧键 `vorush.level1-1.records` 启动时一次性迁移到新键。
- `pickPracticeWords`/`pickTypeFor` 签名不变（已基于传入 wordIds）。

### D4: 词包选择界面——DOM 全屏页
- `ui/PackSelectView.ts`：网格卡片（emoji + 中文名 + ★☆☆）；卡片 ≥60pt；点击 → 回调启动单局。
- 星星数来源：各包 localStorage 记录即时计算（复用 computeStars 规则，pass=记录中存在通关标记——新增 `vorush.clear.<packId>` 标记，结算时写入）。
- 流程：开始界面（解锁音频）→ PackSelectView → LevelController(pack)。
- 结算界面两个按钮：「再玩一次」（重开同包）与「选词包」（销毁当前单局回选包页）。
- 重开/返回实现：销毁 LevelController 实例 + 清理 3D 实体与 DOM，新建实例；比 location.reload() 平滑且保留音频解锁状态。

### D5: LevelController 参数化
- 构造接收 `pack: WordPack`；内部全部 `LEVEL_WORDS/LEVEL_WORD_IDS` 引用改为 `pack.words`。
- 补给箱出题池 = 包内已教词；战前认识遍历包内词（4~6 个）。
- 失败/胜利结算写 `vorush.clear.<packId>`（仅胜利）与记录键。

## Risks / Trade-offs

- [部分词无贴切 emoji（goodbye/monitor/playmates 等）影响"听音选图"可辨识性] → 选用近似 emoji 并在设计上接受占位期妥协；正式资产阶段换插画（记录在设计文档）。
- [销毁/重建 LevelController 清理不全（3D 实体泄漏）] → 统一 `dispose()`：移除 enemies/towers/crate/spot 视图、清空 Tweens、移除 DOM；冒烟测试覆盖"连玩两包"。
- [词包词条数 5~6 时战前认识变长] → 认识环节每词约 4 秒，6 词约 25 秒，仍在 30~45s 预算内。
- [旧记录迁移失败] → try/catch 包裹，失败则从新键重新开始（无数据损失风险以外的代价）。

## Migration Plan

1. 词库模块 + 音频脚本 + 完整性测试先行。
2. questionGenerator/WordBook/LevelController 参数化，单测适配。
3. PackSelectView + Game 流程接线。
4. 浏览器冒烟（两包连玩）+ iPad 走查。

## Open Questions

- 学校包是否参与 Fun Spelling 词族（t/b/m/a/s/f 开头词）的教学？（当前决策：录入词库并在对应包中出现，与 Vocabulary 词同等对待；如需区分主次可后续加权重）
