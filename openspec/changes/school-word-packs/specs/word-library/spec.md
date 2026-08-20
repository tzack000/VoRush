# word-library 规格（新增）

## ADDED Requirements

### Requirement: 多词包数据结构

词库 SHALL 以词包（WordPack）为单位组织：每包含 id、中文名称与 4~12 个单词；单词含 id、词形、emoji 语义图与音频 key。词包数据与游戏逻辑解耦（纯数据模块）。

#### Scenario: 词库完整性

- **WHEN** 加载词库模块
- **THEN** 每个词包包含 4~12 个单词，每个单词都有非空的词形、emoji 与对应音频文件

### Requirement: 学校默书词包内容

词库 SHALL 包含以下学校默书包（保良局何寿南小学 P.1 2025-2026）：T1D1（monitor/classmate/teacher/goodbye + t 词族）、T1D2（grandfather/mother/friend/playmates + b 词族）、T1D3（computer/desk/chair/board + 数字 one~five）、T2D1（feet/fingers/toes/eye + a 词族）、T2D2（elephant/panda/zebra/monkey/tiger/rabbit + m 词族）、T2D3（peaches/mangoes/blueberries/cherries/bananas/watermelon + s 词族）、T3D1（draw/drink/laugh/walk/eat/sleep + f 词族）。

#### Scenario: 默书包词汇与词表一致

- **WHEN** 查看任一学校默书包的单词列表
- **THEN** 与对应 PDF 的 Vocabulary 及 Fun Spelling 词条一致（多词短语按核心词提取）

### Requirement: 核心词提取

多词短语 SHALL 提取核心名词/动词作为学习对象（如 "a monitor"→monitor、"two feet"→feet、"eleven peaches"→peaches），音频与词形均使用核心词。

#### Scenario: 短语提取

- **WHEN** 词条为 "eleven peaches"
- **THEN** 学习词形与发音均为 peaches

### Requirement: 单词音频

每个单词 SHALL 有对应的 m4a 发音文件（`public/assets/audio/words/<id>.m4a`），按词包播放。

#### Scenario: 音频存在且可播放

- **WHEN** 游戏请求播放任一单词发音
- **THEN** 对应 m4a 文件存在并可经 HTMLAudioElement 播放
