# word-library 规格（修改）

## MODIFIED Requirements

### Requirement: 学校默书词包内容

词库 SHALL 包含以下学校默书包（保良局何寿南小学 P.1 2025-2026）：T1D1（monitor/classmate/teacher/goodbye + t 词族）、T1D2（grandfather/mother/friend/playmates + b 词族）、T1D3（computer/desk/chair/board + 数字 one~five）、T2D1（feet/fingers/toes/eye + a 词族）、T2D2（elephant/panda/zebra/monkey/tiger/rabbit + m 词族）、T2D3（peaches/mangoes/blueberries/cherries/bananas/watermelon + s 词族）、T3D1（draw/drink/laugh/walk/eat/sleep + f 词族）、T3D2（goldfish/hamster/parrot/rabbit/run/talk + d 词族）。

#### Scenario: 默书包词汇与词表一致

- **WHEN** 查看任一学校默书包的单词列表
- **THEN** 与对应 PDF 的 Vocabulary 及 Fun Spelling 词条一致（多词短语按核心词提取）

#### Scenario: T3D2 宠物词表

- **WHEN** 查看 T3D2 词包的单词列表
- **THEN** 依次为 goldfish、hamster、parrot、rabbit、run、talk、date、dish、doctor、door、dress
