# pack-selection 规格

## Purpose

本规格由 change `school-word-packs`、`leveled-word-packs`、`overworld-map` 同步而来，描述关卡/词包选择与记录隔离的系统行为。

## MODIFIED Requirements

### Requirement: 关卡选择界面

开始界面之后 SHALL 呈现 3D 微缩岛屿大地图，进入时相机自动取景全部已解锁关卡，玩家 SHALL 可以从任意一个已解锁关卡开始，而不限于"下一个该玩的关"。

#### Scenario: 进入地图时取景全部已解锁关卡

- **WHEN** 玩家从开始界面进入大地图
- **THEN** 相机自动取景全部已解锁关卡（外加下一关做诱饵），每个已解锁关卡都可以直接点击开始，不限于"下一个该玩的关"
