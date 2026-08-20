# 学校默书词包实施任务

## 1. 词库数据层

- [x] 1.1 `src/data/words.ts` 重构：WordPack/WordDef 结构、WORD_PACKS（动物包 + 7 个学校默书包）、getPack/getWord
- [x] 1.2 `scripts/gen-audio.sh`：按词库批量生成 m4a（say + afconvert），执行生成全部音频
- [x] 1.3 vitest 词库完整性：每包 4~12 词、emoji/词形非空、音频文件存在

## 2. 逻辑参数化

- [x] 2.1 `questionGenerator`：干扰项从当前词包取（删除 LEVEL_WORDS 硬编码）
- [x] 2.2 `WordBook` 存储键按包隔离（`vorush.records.<packId>`）+ 动物包旧键一次性迁移
- [x] 2.3 既有单测适配词库 API（economy/starRating/questionSelector 引用处）

## 3. 词包选择界面

- [x] 3.1 `ui/PackSelectView.ts`：词包卡片网格（emoji + 中文名 + 星星，≥60pt）
- [x] 3.2 星星来源：`vorush.clear.<packId>` 通关标记 + 记录即时计算；结算写入

## 4. 单局参数化与流程

- [x] 4.1 `LevelController` 接收 WordPack：战前认识/选题/补给箱/三星判定全部用包内词
- [x] 4.2 `dispose()`：清理 3D 实体、Tweens、DOM；支持同页重开与返回选包
- [x] 4.3 Game 流程：开始界面 → PackSelectView → LevelController(pack)；结算双按钮（再玩/选词包）

## 5. 验证

- [x] 5.1 `tsc` + vitest 全绿，`npm run build` 通过
- [x] 5.2 浏览器冒烟：两个词包连玩完整流程、记录隔离、控制台零错误
- [ ] 5.3 iPad 走查：词包选择、新词音频发音、单局流程
