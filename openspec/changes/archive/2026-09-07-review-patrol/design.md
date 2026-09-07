## Context

见 proposal.md 的 Why。当前学习记录按 `vorush.records.<packId>` 由 `WordBook` 自管，字段只有答题痕迹（attempts / independentTypes / lastWrong），没有熟练度与上次复习时间。大地图只负责选关。进度键约定：通关走 `progress.ts`，学习记录走 `WordBook`，别处不得发明新键。

约束：无新运行时依赖；按钮 ≥60pt；失败不惩罚学习记录；新逻辑放 `learning/` 或 `data/` 并配 vitest；结构与数值调参分离。

## Goals / Non-Goals

**Goals:**
- 在现有 `WordBook` 记录上扩展成长字段，旧 JSON 兼容读取
- 纯函数间隔选题，可单测
- 大地图 DOM 入口 + 复用 `QuizOverlay` 的短会话，不走 `LevelController`
- 复习元数据纳入 `progress.ts`（`vorush.review`）

**Non-Goals:**
- 不做新题型、英雄、Boss、新塔、工坊
- 不做云存档 / 跨设备同步
- 不改关卡战斗数值与出怪
- 不把复习做成第 10 座岛屿（避免改手写地图几何）

## Decisions

### D1: 成长字段写进既有 WordBook，不新建 storage 键

`WordRecordData` 增加 `strength: 0..3` 与 `lastReviewedAt: number`。读写仍是 `vorush.records.<packId>`。缺字段时：`lastReviewedAt = 0`（视为从未复习，立即到期），`strength` 按 `independentTypes.length` 推断（上限 3）。

理由：AGENTS.md 不变量 8 禁止在 WordBook / progress / TutorialOverlay 之外发明键；成长状态本质是学习记录。替代方案「新键 `vorush.growth.<packId>`」会让同一词两份数据，否决。

### D2: 复习元数据走 progress.ts

键名 `vorush.review`，内容 `{ completedCount, lastCompletedAt }`。读写函数放 `src/data/progress.ts`，与通关键并列。

理由：这是进度而非单词能力。替代方案塞进某个词包的 WordBook 会让「完成次数」跟词包绑死。

### D3: 词键工厂收到 WordBook，关卡与复习共用

`bookKey(packId)` 从 `LevelController` 私有函数提升为 `WordBook` 导出。关卡与复习巡逻都通过它读写，避免两处拼键不一致。

### D4: 间隔表是数据，本次只给初始参考值

`REVIEW_INTERVALS_MS = [0, 1d, 3d, 7d]` 对应熟练度 0..3。最近答错（`lastWrong`）无视间隔，视为立即到期。数值待试玩校准，本 change 不调关卡经济/波次。

### D5: 解锁条件 = 至少 1 个通关星

不用「任意 taught」：一年级孩子在失败后更该重玩本关，而不是先看到一个新入口。通关后按钮才出现，降低认知负担。

### D6: 复用 QuizOverlay，新建 ReviewSession

`ReviewSession` 负责：加载已通关词包的 WordBook → 选题 → `generateQuestion`（干扰项仍用该词所在包）→ `QuizOverlay.runQuiz` → 写记录 / 完成面板。不调用 `island.buildTerrain`，不创建战斗实体。大地图保持显示，答题遮罩挡住拾取。

替代方案「复用 LevelController 跳过战斗」会把会话状态机搅乱，否决。

### D7: 入口是 DOM 按钮，不是第 10 座岛

右下角大按钮 + 到期红点。不改 `levelMaps` / 地图几何，也就不用动 `levelMaps.test.ts` 的平台约束。

### D8: 关卡内答题也更新成长字段

`recordAnswer` 统一推进 `strength` / `lastReviewedAt`。刚通关当天若全部独立答对，间隔未到期，按钮仍可点（「再练练」）但不带红点。刚引导完成的词立即到期，通关回地图就能看到红点。

## Risks / Trade-offs

- [刚通关且全对时当天没有红点，孩子发现不了入口] → 按钮本身足够大且常驻（通关后）；确认卡在无到期词时改口吻为「再练练」。
- [旧记录缺字段被当成从未复习，首次巡逻题量偏大] → 符合「该复习」；兼容读取不丢答题历史。
- [复习答错重置熟练度，家长以为「退步了」] → 规格明确：独立掌握记录（independentTypes）保留，只重置间隔用的熟练度。
- [多词包加载多次 localStorage] → 最多 9 包，可忽略。

## Migration Plan

无需迁移脚本。首次读取旧 `vorush.records.*` 时现场补默认值；新字段随下一次 `save` 写回。`vorush.review` 缺失视为完成 0 次。回滚：去掉入口即可，旧字段留在 JSON 里无害。

## Open Questions

无。间隔天数按初始参考值落地，试玩后再单独开调参 change。
