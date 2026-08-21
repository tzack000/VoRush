# pack-selection 规格

## Purpose

本规格由 change `school-word-packs`、`leveled-word-packs` 同步而来，描述关卡/词包选择与记录隔离的系统行为。

## Requirements

### Requirement: 关卡选择界面

开始界面之后 SHALL 呈现关卡选择界面：按关卡顺序的网格展示全部关卡（序号、emoji、名称、已获得星星数、锁定状态），点击已解锁关卡进入该关完整单局并自动加载绑定词包。

#### Scenario: 网格展示

- **WHEN** 进入关卡选择界面
- **THEN** 每关显示为不小于 60pt 的可点卡片，含序号、emoji、名称、0~3 星状态与锁定/解锁标识

#### Scenario: 进入关卡

- **WHEN** 点击某已解锁关卡卡片
- **THEN** 进入以该关绑定词包为学习内容的完整单局（战前认识→布防→三波→结算）

### Requirement: 结算后返回

单局结算（胜利或失败）后 SHALL 提供返回关卡选择的入口；也可直接重玩本关。

#### Scenario: 胜利后返回选择

- **WHEN** 结算界面点击返回按钮
- **THEN** 回到关卡选择界面，各关卡卡片显示最新星星数与解锁状态

### Requirement: 学习记录按包隔离

每个词包的学习记录 SHALL 使用独立的持久化键（含包 id），互不影响；教学引导标记全局共享。

#### Scenario: 记录隔离

- **WHEN** 玩家在动物包答对 cat 后切换到 T1D1 包所在关卡
- **THEN** T1D1 包的学习记录不含 cat 的答题历史，动物包记录保持完整
