# dom-ui-layer 规格（新增）

## ADDED Requirements

### Requirement: DOM 覆盖层 UI

全部界面元素（答题、HUD、建造菜单、结算、教学引导）SHALL 以 DOM/CSS 覆盖层实现于 3D 画布之上；主要按钮点击区域不小于约 60pt；固定横屏布局。

#### Scenario: 大按钮触控

- **WHEN** 在 iPad 上渲染任意主要按钮（答题选项、建造、开始波次）
- **THEN** 其 CSS 尺寸不小于约 60pt 且有点击反馈

#### Scenario: 横屏布局

- **WHEN** 设备处于横屏
- **THEN** UI 元素布局完整不溢出；竖屏时显示"请旋转设备"提示

### Requirement: 输入协调

UI 覆盖层打开（答题、菜单、结算）时 MUST 屏蔽 3D 场景的指针交互；关闭后恢复。答题打开时战斗完全暂停的规则不变。

#### Scenario: 答题屏蔽 3D 交互

- **WHEN** 答题覆盖层打开
- **THEN** 点击不会穿透到 3D 场景（不会误建塔、误点补给箱），战斗保持暂停

### Requirement: 单词图片呈现

单词的语义图片 SHALL 在 DOM 层以大字号 emoji 呈现（占位期），与答题选项布局适配。

#### Scenario: 听音选图选项

- **WHEN** 出现听音选图题
- **THEN** 4 个选项为不小于 60pt 的 emoji 图按钮，1 正 3 误
