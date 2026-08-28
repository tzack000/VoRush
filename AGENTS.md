# AGENTS.md · AI 编程助手协作约定

给在本仓库工作的 AI 编程助手（Claude Code / CodeBuddy 等）的约定。人类读者见 [README.md](./README.md)。

## 项目是什么

VoRush：给**小学一、二年级孩子**的"学习优先"英语单词塔防（家长为孩子自用开发）。TypeScript + three.js + Vite，运行时依赖只有 `three`。目标设备 **iPad 横屏 Safari**。

所有产品决策都要过"一年级孩子能不能懂/够不够友好"这一关：无血腥、无复杂数值面板、按钮 ≥60pt、失败不惩罚学习记录。

## 常用命令

```bash
npx tsc --noEmit     # 类型检查（改完必跑）
npx vitest run       # 全量单测（改完必跑，当前 79 例必须保持全绿）
npm run build        # tsc + vite build
npm run dev          # 开发服务器
```

浏览器验证用 `agent-browser` CLI（不用 playwright 包，未安装）。页面暴露 `window.__vorush` 调试钩子：`spotScreenPos / mapLevels / mapCamera / levelMap / goalScreenPos / terrainInfo / battleStats`。URL 加 `?debug=1` 显示 FPS。

**看不到画面**：如果模型不支持读图，用 DOM 断言 + `__vorush` 数值断言代替截图（本仓库的既有验证脚本都这么做，可参考会话历史中的用法）。

## 架构不变量（违反会造成静默 bug）

1. **`islandHeight(x,z)` 读模块级"当前岛屿形状"**（`src/world/coords.ts`）。`setIslandShape` 只允许 `IslandScene.buildTerrain()` 首行调用。**进关顺序固定**：`controller.dispose()` → `island.buildTerrain()` → `new LevelController()`。顺序反了实体贴上一关高度——有 `terrainReady` 断言兜底，别绕过它。
2. **共享材质绝不 dispose**。`models.ts` / `mapProps.ts` 的材质缓存带 `userData.shared = true`，`disposeObject`（`src/world/dispose.ts`）会跳过。释放关卡实体一律走 `disposeObject`。
3. **倒影复用岛屿 geometry**：`clearTerrain` 里先移除倒影并只 dispose 它的材质，geometry 由岛屿侧统一释放，恰好一次。
4. **两个 scene 一个 renderer**：战斗视图与大地图各持 scene/camera，`IslandScene.setView()` 切换；拾取射线用 `activeCamera`。
5. **帧回调必须可注销**：`island.onFrame(cb)` 返回 disposer，持有并在 `dispose()` 里调用（否则重玩叠帧）。
6. **渲染/输入（world、combat）与 UI（ui、DOM）分离**：战斗逻辑是纯 TS 可单测的，视图每帧同步。新逻辑放 `combat/` 或 `data/` 并配 vitest，不要塞进视图类。
7. **多路径**：`LevelController.lanes` 数组；敌人持有自己的 `Path` 与 `goalId`；分岔/合流 = 折线共享前缀/后缀，**不要**引入运行时分岔概念。塔索敌优先级用 `enemy.remaining`（跨路径可比），不要用 `dist`。
8. **进度键**：`vorush.clear.<levelId>`（三星结果 JSON）与 `vorush.records.<packId>`，读写统一走 `src/data/progress.ts`，别在别处直接碰 localStorage。

## 数据即源

`src/data/` 全部是纯数据/纯函数，单测覆盖。改动要同步测试：

- **`words.ts`**：词包与词表。加词包后要接 `levels.ts` 的 `PACK_ORDER`，**并补 `levelMaps.ts` 的一张地图**（缺了启动即抛错），然后 `bash scripts/gen-audio.sh` 补发音，更新 `tests/wordLibrary.test.ts` / `tests/levels.test.ts`。
- **`levelMaps.ts`**：9 张手写地图。坐标受 `tests/levelMaps.test.ts` 的几何约束强制（平台上、视野内、分支间距 ≥100px、塔位距路 70-150px、两路等长差 ≤15%…）。越界时**沿指向 (640,360) 方向内移 20-40px**，不要改结构。`islandShapeFor` 的随机参数有快照锁定——改 seed 会让全部手写坐标失效并红灯。
- **平衡数值**（`economy.ts`、`waves.ts` 的 `EXIT_LIVES`、`levels.ts` 的 `scaleFor`）改动要单独说明动机；结构改动与数值调参**不要混在同一个 change**。

## OpenSpec 工作流（每个功能都要走）

```
openspec/changes/<name>/  proposal.md + design.md + tasks.md + specs/<capability>/spec.md（delta 格式）
```

1. 用 `npx openspec validate <name>` 校验 delta 格式（MODIFIED 的 Requirement 必须带正文 + Scenario）。
2. 实现、验证、勾完 tasks。
3. 把 delta **手动同步**到 `openspec/specs/` 主规格（`## ADDED/MODIFIED` → 主规格格式，别直接复制 delta 头）。
4. `mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>`，随代码一起 commit。
5. `npx openspec validate --specs` 必须 12 个全过。

主规格是行为契约：改行为前先读对应规格（`tower-defense-combat` / `level-terrain` / `world-map` / `level-session`…），改完行为要同步规格。

## 沟通与提交约定

- 提交信息、规格、tasks 用**中文**；代码标识符与注释中英混合均可（仓库现状如此）。
- commit message 首行 `feat/fix/refactor(<scope>): <摘要>`，正文讲"为什么"和实测数据。
- 完成一个功能 = 代码 + 测试 + 规格同步 + 归档 + 提交，一次做完，不留半成品 change。
- 验证结论要给**数字**（测试数、FPS、屏幕坐标、均衡度），不要只说"通过"。

## 边界

- 不引入新运行时依赖（three 之外）；不引入外部模型/贴图/字体文件。
- 不做 P1 范围内容：英雄单位、Boss、魔法塔/炮塔、字母排序玩法（设计文档里的 P1 清单）。
- 竖屏只显示"请旋转设备"，不支持；相机固定斜俯视，不做旋转/双指缩放。
- iPad 性能预算：战斗与大地图不同屏，静态合批/InstancedMesh 已做，新场景对象注意数量。
