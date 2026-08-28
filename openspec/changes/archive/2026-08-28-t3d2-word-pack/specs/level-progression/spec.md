# level-progression 规格（修改）

## MODIFIED Requirements

### Requirement: 关卡序列与词包绑定

游戏 SHALL 提供有序关卡序列，每关绑定一个词包：第 1 关动物伙伴，第 2~9 关依次为 T1D1、T1D2、T1D3、T2D1、T2D2、T2D3、T3D1、T3D2。进入关卡时自动加载绑定词包，无需玩家选择词包。

#### Scenario: 关卡自动加载词包

- **WHEN** 玩家进入第 5 关
- **THEN** 单局自动使用 T2D1 词包（战前认识、练习、出题均为该包单词）

#### Scenario: 新增词包即新增关卡

- **WHEN** 词库新增 T3D2 词包并接入关卡序列
- **THEN** 关卡选择页出现第 9 关（T3D2），需通关第 8 关（T3D1）后解锁
