# render-3d-scene 规格 规格

## Purpose

本规格由 change `threejs-3d-migration` 同步而来，描述 render-3d-scene 规格 的系统行为。

## ADDED Requirements

### Requirement: 多视图渲染

渲染层 SHALL 支持多个 scene/camera 视图（战斗场景、大地图）共用同一个 renderer 与同一个动画循环：通过切换当前视图决定每帧渲染哪个场景；射线拾取 SHALL 使用当前视图的相机。

#### Scenario: 战斗与大地图切换

- **WHEN** 玩家从大地图进入单局
- **THEN** 渲染切换为战斗场景与战斗相机，拾取射线同样切回战斗相机

#### Scenario: 单局结束回到大地图

- **WHEN** 单局结算后返回大地图
- **THEN** 渲染切换为大地图场景与地图相机，战斗物体不出现在画面中

#### Scenario: 视口变化同步全部相机

- **WHEN** 窗口尺寸或设备方向变化
- **THEN** 所有已登记的相机同步更新宽高比

### Requirement: 大地图相机与帧回调

大地图 SHALL 使用固定的斜俯视相机（不支持旋转缩放），相机平移 SHALL 平滑收敛在地图边界内；渲染层 SHALL 提供可注销的帧回调，避免重玩关卡时回调叠加。

#### Scenario: 平移动画

- **WHEN** 进入地图或播放解锁动画
- **THEN** 相机目标点以缓动方式移动到目标岛屿，最终停在地图边界内

#### Scenario: 帧回调不叠加

- **WHEN** 玩家在同一会话内重玩同一关多次
- **THEN** 每帧仍然只执行一次关卡更新逻辑
