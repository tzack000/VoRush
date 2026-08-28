## 1. 词库数据

- [x] 1.1 `src/data/words.ts` 新增 `t3d2` 词包（11 词，核心词提取：a goldfish→goldfish 等）
- [x] 1.2 补齐每题 emoji，包内 emoji 互不重复

## 2. 关卡接入

- [x] 2.1 `src/data/levels.ts` 的 `PACK_ORDER` 追加 `t3d2`（第 9 关）
- [x] 2.2 确认难度缩放自动生效（hpMult 2.2 / speedMult 1.32 / countBonus 4）

## 3. 音频生成

- [x] 3.1 运行 `bash scripts/gen-audio.sh` 生成新词 m4a（rabbit 复用已有文件）
- [x] 3.2 抽查 3~5 个新音频可正常播放

## 4. 测试与规格

- [x] 4.1 `tests/wordLibrary.test.ts` 补充 t3d2 词表断言
- [x] 4.2 `tests/levels.test.ts` 更新为 9 关，第 9 关为 t3d2
- [x] 4.3 `tsc` + vitest 全绿，`npm run build` 通过

## 5. 验证与归档

- [x] 5.1 浏览器冒烟：解锁第 9 关后进入，战前认识与出题均为宠物词表
- [x] 5.2 同步 delta 规格到 `openspec/specs/` 并归档本 change
