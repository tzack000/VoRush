# 迁移 three.js 真 3D（Bad North 视觉方向）

## Why

P0 原型（Phaser 2D 版）功能已完成并通过浏览器冒烟测试。视觉方向已确认为 **Bad North 参考：低多边形 3D、微缩岛屿、干净轮廓、柔和手绘感**。2D 引擎无法实现该质感，用户已决策迁移到 three.js 真 3D 渲染。业务逻辑（学习/经济/状态机）为纯 TS、与引擎解耦，迁移成本集中在渲染与 UI 层。

## What Changes

- 渲染引擎：移除 Phaser，改用 three.js；Vite + TypeScript 工程保留
- 场景表现：微缩岛屿地形（低多边形地面/路径/水面）、斜俯视相机、柔和光照（半球光+平行光、flat shading）， pastel 低饱和配色
- 实体表现：塔/敌人/骑士/补给箱用 three.js 几何体拼装低模（圆锥、盒子、二十面体等），无需外部模型资源；保留"击败后跳走消失"的非血腥表现
- UI 层重构：答题界面、HUD、按钮、结算、教学引导改为 **DOM/CSS 覆盖层**（3D 画布之上）——更适配儿童大按钮与触控，中文排版更可靠
- 音频：沿用已验证的 m4a 单词音频 + WebAudio 音效（脱离 Phaser 音频系统，用原生 AudioContext/HTMLAudio）
- **保留不动**：learning/economy/session/questionGenerator 等纯 TS 模块及其 17 个单测；P0 全部玩法规则与数值；数据配置层
- 规格层面：玩法需求（specs）不变，仅交互/呈现的实现路径变化——本 change 的 specs 只补充 3D 呈现相关的新约束

明确不做：不引入外部 3D 模型/贴图资源（首版全部程序化低模）；不做光影后处理（bloom 等）；不改变任何玩法规则与数值。

## Capabilities

### New Capabilities

- `render-3d-scene`: three.js 渲染基础设施——微缩岛屿地形与路径、斜俯视相机、柔和光照与 pastel 调色、低模实体（塔/敌人/骑士/补给箱）、非血腥击败动画、iPad 性能预算（60fps、DrawCall 控制）
- `dom-ui-layer`: DOM/CSS 覆盖层 UI——答题界面、HUD、建造菜单、结算、教学引导；≥60pt 触控、横屏适配、与 3D 场景的输入协调（UI 打开时 3D 场景交互屏蔽）

### Modified Capabilities

（无——玩法需求不变；`word-learning`、`learning-economy`、`tower-defense-combat`、`battle-events`、`level-session` 的 requirement 均不改动）

## Impact

- 代码：移除 `phaser` 依赖，新增 `three`；`src/scenes/`、`src/combat/`（表现部分）、`src/quiz/QuizOverlay`、`src/ui/` 全部重写；`src/learning/`、`src/economy/`、`src/data/`、`src/session/SessionStateMachine` 基本原样保留
- 资产：`public/assets/audio/words/*.m4a` 沿用
- 测试：纯逻辑单测不受影响；3D/DOM 层靠浏览器冒烟验证
- 风险：iPad Safari WebGL 性能需实测（低模+无后处理，风险可控）
