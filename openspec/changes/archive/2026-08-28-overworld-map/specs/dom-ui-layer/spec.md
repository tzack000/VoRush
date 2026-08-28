# dom-ui-layer 规格 规格

## Purpose

本规格由 change `threejs-3d-migration`、`kr-style-building` 同步而来，描述 dom-ui-layer 规格 的系统行为。

## ADDED Requirements

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
