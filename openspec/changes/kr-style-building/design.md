# KR 式建造技术设计（简）

## Context

建造流程当前为"侧边菜单选塔型 → 点塔位"两步，且 `onSpotTapped` 限定 `session.state.phase === 'BUILD'`。改 KR 式：点旗弹菜单、随时可建。

## Decisions

### D1: 弹窗为 DOM 绝对定位，锚定塔位投影坐标
- `island.projectToScreen(worldOf(spot))` 得屏幕坐标；弹窗 `position:absolute`，水平居中于锚点、位于锚点上方；视口边缘 clamp（左右 12px 边距）。
- 菜单外关闭：弹窗打开时在 `#ui` 加全屏透明遮罩（pointer-events auto）拦截点击并关闭；遮罩不遮挡视觉、不暂停战斗，pickier 保持 enabled（遮罩先收到事件，3D 拾取自然被挡——符合"点菜单外关闭"语义）。

### D2: 建造/升级放开阶段限制
- `onSpotTapped`/`showUpgradePanel` 移除 `phase === 'BUILD'` 判断；仅要求：弹窗/答题未打开、金币足够。
- 弹窗打开不暂停 combatPaused；答题（QuizOverlay）打开时仍照旧暂停并屏蔽拾取。

### D3: 教学简化为三步
- step1：进入 BUILD(0) 高亮最近塔位旗帜「点旗子建塔」；
- step2：弹窗打开后高亮弓箭塔卡片；
- step3：建造完成高亮阶段按钮「点这里继续」→ finish。

## Risks / Trade-offs

- [战斗中弹窗遮挡战场] → 弹窗小（两张卡片横排）、锚定塔位旁、菜单外一击即关。
- [弹窗期间误触其他塔位] → 全屏透明遮罩拦截，点击即关弹窗不触发建造。
