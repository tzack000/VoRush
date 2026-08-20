#!/usr/bin/env bash
# 按词库批量生成单词发音 m4a（macOS say + afconvert）。
# 用法：bash scripts/gen-audio.sh（在仓库根目录执行）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/assets/audio/words"
mkdir -p "$OUT_DIR"

# 词库为 TS，用 grep 提取 w('<id>') 形式的 id
IDS=$(grep -oE "w\('[a-z]+'" "$ROOT/src/data/words.ts" | sed "s/w('//;s/'//" | sort -u)

count=0
for id in $IDS; do
  if [ ! -f "$OUT_DIR/$id.m4a" ]; then
    say -v Samantha -r 145 -o "/tmp/vorush_word_$id.aiff" "$id"
    afconvert -f m4af -d aac "/tmp/vorush_word_$id.aiff" "$OUT_DIR/$id.m4a"
    rm -f "/tmp/vorush_word_$id.aiff"
    count=$((count + 1))
  fi
done
echo "done. newly generated: $count, total ids: $(echo "$IDS" | wc -w | tr -d ' ')"
