# three.js 3D 迁移实施任务

## 1. 基线与依赖

- [x] 1.1 `git init` 并提交 Phaser 版基线（可回滚点）
- [x] 1.2 安装 `three` + `@types/three`，移除 `phaser`；调整 tsconfig/vite 配置

## 2. 渲染基础设施（src/world/）

- [x] 2.1 `Tween.ts`：轻量补间（number/Vector3/scale/opacity + 缓动 + 回调），挂渲染循环；补 2-3 个单测
- [x] 2.2 `IslandScene.ts`：renderer、半球光+平行光、固定斜俯视相机（FOV~30）、渲染循环与 resize
- [x] 2.3 程序化岛屿地形：顶点位移 + 顶点着色（草地/路径带/沙岸）+ 水面，flat shading
- [x] 2.4 `models.ts` 低模工厂：哥布林/野狼/队长、弓箭塔×3 级、骑士营地×3 级、骑士、补给箱
- [x] 2.5 `RaycastPicker.ts`：塔位/补给箱/已建塔的指针拾取；`uiOpen` 时屏蔽

## 3. 战斗逻辑与表现拆分（src/combat/ + src/world/）

- [x] 3.1 Enemy 拆分为纯逻辑（hp/dist/blockedBy/移动与交战）+ 3D 视图绑定（模型同步、血条、跳走消失动画）
- [x] 3.2 WaveSpawner 逻辑保留，接 3D 出怪表现
- [x] 3.3 弓箭塔/骑士营地逻辑保留，攻击与升级接 3D 表现（箭矢飞行、骑士站位、升级变模）

## 4. DOM UI 重写（src/ui/）

- [x] 4.1 全局 UI 框架：覆盖层容器、通用按钮样式（≥60pt、点击反馈）、横屏锁定与旋转提示
- [x] 4.2 QuizOverlay 改 DOM：题面 + 4 选项 + 🔊 重播；答错温和反馈与引导高亮流程不变
- [x] 4.3 HUD/建造菜单/升级面板改 DOM；开始界面（手势内解锁音频）
- [x] 4.4 结算（三星/失败）与首次教学引导改 DOM

## 5. 接线与音频

- [x] 5.1 `WordAudio` 改 m4a 原生播放（HTMLAudioElement/WebAudio），去掉 speechSynthesis 主路径
- [x] 5.2 SessionStateMachine 接线：PRE_TEACH→BUILD→PRACTICE→COMBAT→SETTLE/FAIL 全流程在 3D 版跑通；补给箱事件接 RaycastPicker + DOM 答题

## 6. 验证

- [x] 6.1 `tsc` + vitest 全绿（含新增 tween 测试），`npm run build` 通过
- [x] 6.2 浏览器冒烟：完整单局流程、UI 打开时 3D 交互屏蔽、控制台零错误
- [ ] 6.3 iPad 真机走查：Bad North 风格观感、满场帧率、音频、约 8 分钟单局
