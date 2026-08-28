# dom-ui-layer 规格 规格

## Purpose

本规格由 change `threejs-3d-migration`、`kr-style-building`、`overworld-map` 同步而来，描述 dom-ui-layer 规格 的系统行为。

## Requirements

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

### Requirement: 锚定式建塔菜单

建塔菜单 SHALL 弹出在被点击塔位的屏幕位置旁（视口内自动防溢出），展示塔型卡片（emoji、名称、儿童提示、价格、可负担状态）；点击菜单外区域或卡片后关闭。

#### Scenario: 菜单锚定塔位

- **WHEN** 玩家点击屏幕右侧的塔位旗帜
- **THEN** 建塔菜单出现在该塔位附近且不超出屏幕右边缘

#### Scenario: 菜单外点击关闭

- **WHEN** 建塔菜单打开时玩家点击菜单外的战场区域
- **THEN** 菜单关闭，不建造任何塔

### Requirement: 大地图 DOM 层

大地图的界面元素（标题、关卡标签、关卡信息卡、提示条）SHALL 以 DOM/CSS 覆盖层实现于 3D 画布之上；地图层本身 SHALL 不吃指针事件，拖拽与点击穿透到 canvas，只有卡片与按钮可点。

#### Scenario: 标签锚定岛屿

- **WHEN** 相机平移导致岛屿移动
- **THEN** 关卡标签每帧跟随岛屿顶端位置，滑出画面的标签隐藏

#### Scenario: 地图层不吃事件

- **WHEN** 玩家在标签文字上方拖动
- **THEN** 拖拽仍然作用于地图相机，不被标签拦截

### Requirement: 关卡信息卡

关卡信息卡 SHALL 为模态：半透明背景覆盖全屏，点击卡片外区域关闭；按钮点击区域不小于约 60pt。

#### Scenario: 卡片外点击关闭

- **WHEN** 信息卡打开时点击卡片外的区域
- **THEN** 卡片关闭且不进入关卡

#### Scenario: 大按钮触控

- **WHEN** 在 iPad 上显示信息卡
- **THEN** 开始与关闭按钮的 CSS 尺寸不小于约 60pt

### Requirement: 地图提示条

短暂的提示（如"先通过第 N 关吧！"、"新关卡解锁！"）SHALL 以屏幕上的提示条呈现，约 1.8 秒后自动消失，重复触发时替换而非叠加。

#### Scenario: 提示自动消失

- **WHEN** 点击锁定岛屿后出现提示条
- **THEN** 提示条在约 1.8 秒后自行移除，不会残留遮挡地图

#### Scenario: 重复提示不叠加

- **WHEN** 短时间内连续点击多个锁定岛屿
- **THEN** 屏幕上同时只有一条提示
