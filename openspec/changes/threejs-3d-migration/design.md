# three.js 3D 迁移技术设计

## Context

P0 原型（Phaser 2D）已完成：业务逻辑（learning/economy/session/quiz 生成器）为纯 TS 且有 17 个单测，渲染与 UI 层是 Phaser GameObject。视觉方向确认为 Bad North 低多边形 3D，用户决策迁移 three.js。约束不变：iPad 横屏、触控优先、答题暂停战斗、数据驱动数值。

## Goals / Non-Goals

**Goals:**
- three.js 渲染 Bad North 风格微缩岛屿：低模地形/路径/水面、固定斜俯视相机、柔和光照、flat shading、pastel 配色。
- UI 全面改为 DOM/CSS 覆盖层（答题/HUD/建造/结算/教学）。
- 纯 TS 业务模块与单测零改动迁移；玩法规则与数值零变化。
- iPad Safari 流畅（低模、无后处理、DrawCall 预算）。

**Non-Goals:**
- 不使用外部 3D 模型/贴图（全部程序化低模）。
- 不做后处理特效（bloom/SSAO）、不做相机动画/旋转缩放。
- 不改 P0 玩法范围；不做 P1 内容。

## Decisions

### D1: three.js + 保留 Vite/TS，移除 Phaser
- `three`（npm，当前 r1xx）单依赖 + `@types/three`。
- 删除 `phaser`；`BootScene/LevelScene` 概念替换为 `Game` 入口类 + 3D 场景图。
- 备选 Babylon.js：生态同样成熟但包体更大、团队资料以 three 为主，选 three。

### D2: 渲染与 UI 分层——3D 画布 + DOM 覆盖层
- 3D 仅负责世界呈现（岛屿、路径、实体、动画）。
- **全部 UI 用 DOM/CSS**：儿童大按钮、中文排版、可访问性都显著优于 Canvas 绘制；也是 three.js 项目的常规做法。
- 输入协调：UI 覆盖层用 `pointer-events: auto` 拦截；3D 画布只在无覆盖层时接收 Raycaster 拾取（塔位、补给箱、塔的点击）。
- 备选：three 内嵌 3D UI（troika-text 等）——排版与维护成本高，否决。

### D3: 场景构建——程序化低模岛屿
- 地形：`PlaneGeometry` 高分段 + 顶点位移生成岛屿起伏，按高度/路径距离顶点着色（草绿/土黄路径/沙岸），`flatShading: true` 出低多边形面感；水面为大平面 + 柔和蓝色。
- 路径数据沿用 `data/level.ts` 的拐点，映射到 3D 平面坐标（x, 0, z）。
- 实体拼装：哥布林=绿色圆锥身+球头；野狼=灰色拉长盒+尖耳；队长=加大+双角；弓箭塔=方柱+三角顶；骑士营地=围栏+帐篷锥；补给箱=盒子+盖。材质统一 `MeshStandardMaterial(flatShading)` 或 `MeshToonMaterial`。
- 光照：HemisphereLight（天蓝/草绿）+ DirectionalLight（暖色，无阴影贴图——用 blob shadow 圆片或直接无阴影）。
- 相机：PerspectiveCamera 小视角（FOV ~30）远距离斜俯（约 45°），模拟微缩模型感；固定不动。

### D4: 动画——轻量自研 tween
- 移除 Phaser 后 tween 缺失。引入 `gsap`？或自研 40 行 tween 工具（缓动 + onUpdate/onComplete，挂在渲染循环）。选自研：用量极小（位移/缩放/透明度），避免新依赖。
- 敌人移动/攻击/血条（血条用 sprite 或头顶小平面）沿路径插值，逻辑沿用现有 Enemy/WaveSpawner 的状态机部分，表现层替换。

### D5: 代码组织——保留纯逻辑，替换表现层
```
src/
  main.ts              # Game 启动：renderer + loop
  world/               # 3D 表现层（新增）
    IslandScene.ts     # 地形/光照/相机/渲染循环
    models.ts          # 低模工厂（塔/敌人/骑士/补给箱）
    Tween.ts           # 轻量补间
    RaycastPicker.ts   # 塔位/补给箱拾取
  ui/                  # 重写为 DOM（QuizOverlay/Hud/BuildMenu/ResultView/Tutorial）
  combat/              # Enemy/WaveSpawner 保留逻辑，视觉部分剥离到 world/
  learning/ economy/ data/ session/  # 原样保留
```
- Enemy 等类拆分：`combat/` 保留纯逻辑（hp、dist、blockedBy、updateEnemy 返回状态），`world/` 订阅其状态做表现。即以"逻辑实体 + 视图绑定"方式重构。

### D6: 音频——原生 WebAudio
- `sfx.ts` 已纯 WebAudio，保留。
- `WordAudio` 改为 `HTMLAudioElement` 或 WebAudio buffer 播放 `public/assets/audio/words/*.m4a`；解锁手势逻辑沿用（开始按钮内 resume AudioContext + 播放一次静音元素）。

## Risks / Trade-offs

- [iPad WebGL 性能不及预期] → 低模 + 合并静态地形 geometry + 无阴影贴图；真机走查验证（沿用 9.2 流程）。
- [DOM UI 与 3D 输入穿透 bug] → 覆盖层统一 `pointer-events` 管理 + 一个全局 `uiOpen` 计数；冒烟测试覆盖"答题中点塔位无效"。
- [重写工作量集中在表现层] → 逻辑层不动，风险可控；迁移期间 Phaser 版代码保留在 git 历史/分支中可回滚（本仓库尚未初始化 git，先 `git init` 提交基线）。
- [自研 tween 边角 bug] → 只支持用到的插值类型（number/Vector3/scale/opacity），单测覆盖核心插值。
- [emoji 在 DOM 层与 Bad North 风格略违和] → 占位期可接受；正式资产阶段替换为手绘风插画。

## Migration Plan

1. `git init` 并提交 Phaser 版基线（可回滚）。
2. 新增 `three`、移除 `phaser`；按 D5 结构先跑通"空岛屿 + 相机 + 光照"。
3. 逐模块迁移：地形路径 → 敌人/出怪 → 塔 → DOM UI（答题/HUD/建造）→ 事件/结算/教学 → 音频接线。
4. 每步保持 `tsc` + vitest 全绿；完成后浏览器冒烟 + iPad 真机走查。

## Open Questions

- 是否需要极简编辑器工具调整岛屿造型？（首版手工调顶点参数即可，不建工具）
- 水面要不要轻微波动动画？（低成本加分项，tasks 中列为可选项）
