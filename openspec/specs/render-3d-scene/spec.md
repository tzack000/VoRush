# render-3d-scene 规格 规格

## Purpose

本规格由 change `threejs-3d-migration` 同步而来，描述 render-3d-scene 规格 的系统行为。

## Requirements

### Requirement: 微缩岛屿场景

游戏场景 SHALL 呈现为 Bad North 风格的微缩岛屿：低多边形地面块、明显的路径带、岛屿边缘落入水面；整体使用 pastel 低饱和配色与干净轮廓。

#### Scenario: 岛屿与路径可辨识

- **WHEN** 渲染 1-1 关卡场景
- **THEN** 可见一座微缩岛屿，地面为低多边形块，敌人行进路径以柔和土色带清晰区别于草地，岛屿四周为水面

#### Scenario: 柔和光照

- **WHEN** 场景渲染
- **THEN** 使用半球光加单一平行光的柔和照明，几何体使用 flat shading，无写实纹理、无强对比阴影

### Requirement: 斜俯视相机

相机 SHALL 采用固定斜俯视视角（参考 Bad North 的微缩模型观感），不支持旋转缩放（首版锁定视角避免儿童误操作）。

#### Scenario: 固定视角

- **WHEN** 单局进行中
- **THEN** 相机保持固定斜俯视角，整个岛屿与全部塔位在视野内，用户手势不改变相机

### Requirement: 低模实体

塔、敌人、骑士、补给箱 SHALL 由 three.js 基础几何体拼装为低多边形模型（圆锥、盒子、二十面体等），不依赖外部模型文件；升级后塔的外观必须明显变化。

#### Scenario: 敌人低模

- **WHEN** 哥布林、野狼、哥布林队长出现在场景中
- **THEN** 三者以不同的低模形体与配色可明确区分（体型、颜色、装饰件）

#### Scenario: 塔升级外观变化

- **WHEN** 塔升至 2 级或 3 级
- **THEN** 模型出现明显变化（增高、加装饰件或变色）

### Requirement: 非血腥击败表现

敌人被击败时 SHALL 播放跳起缩小消失的动画；不表现血腥、尸体或痛苦。

#### Scenario: 击败动画

- **WHEN** 任意敌人生命归零
- **THEN** 其模型跳起并缩小消失，场景内不留下尸体

### Requirement: iPad 性能预算

场景 MUST 在 iPad Safari 上保持流畅：全场 DrawCall 有预算控制（静态地形合并、同类几何复用材质），目标接近 60fps。

#### Scenario: 第三波满场

- **WHEN** 第三波全部敌人、全部已建塔与特效同时在场
- **THEN** 画面在 iPad Safari 上无明显掉帧
