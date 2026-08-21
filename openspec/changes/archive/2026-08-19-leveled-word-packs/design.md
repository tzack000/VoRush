# 词包分级与关卡递进技术设计（简）

## Context

8 个词包已实现，平铺可选。现需：有序关卡绑定词包、难度递增、通关解锁。波次配置（waves.ts）为静态数据，需引入按关卡缩放的机制。

## Decisions

### D1: 关卡定义——数据驱动
`src/data/levels.ts`：
```ts
interface LevelDef { index: number; id: string; packId: string; scale: DifficultyScale }
interface DifficultyScale { hpMult: number; speedMult: number; countBonus: number }
```
- 8 关：index 1~8，packId 对应 8 个词包；scale 由 index 推导：`hpMult = 1 + 0.15*(index-1)`，`speedMult = 1 + 0.04*(index-1)`，`countBonus = Math.floor((index-1)/2)`（每组出怪 +0~3）。
- 缩放逐关平滑，避免跳变；数值列入"待试玩校准"。

### D2: 波次缩放——纯函数
`scaleWaves(base: WaveDef[], scale): WaveDef[]`：对每组 count+countBonus（至少 1）；敌人属性在生成时应用 hp/speed 乘区（`scaleEnemy(def, scale)` 返回新 def）。纯函数，单测覆盖。

### D3: 解锁规则——纯函数
`isLevelUnlocked(index, clearedIds: Set<string>): boolean`：index===1 恒 true；否则前一关 id 在 clearedIds 中。通关标记沿用 `vorush.clear.<id>`（关卡 id 与词包 id 一致，无迁移）。

### D4: 关卡选择页——PackSelectView 演进
- 数据源从 WORD_PACKS 改为 LEVELS（join 词包取名称/emoji/星星）。
- 卡片增加序号角标与 🔒 锁定态（置灰 + 不响应点击）。

## Risks / Trade-offs

- [难度乘区破坏既有平衡（第 1 关验证过的节奏）] → 第 1 关 scale 恒为 1 基础值；高关卡数值待试玩校准，集中在 levels.ts 调整。
- [孩子卡关无法推进] → 通关星即可解锁（不要求三星）；失败可无限重试且保留学习记录。
