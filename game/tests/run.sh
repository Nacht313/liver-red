#!/usr/bin/env bash
# 跑 Godot 測試。用法：bash game/tests/run.sh [檔名關鍵字]
# Godot 遇到腳本錯誤時結束碼仍然是 0，所以這裡改看最後的總結行：要有「N 項，0 項失敗」才算通過。
set -uo pipefail
GODOT="${GODOT:-/Applications/Godot.app/Contents/MacOS/Godot}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$DIR/project.godot" ] || { echo "找不到 $DIR/project.godot"; exit 1; }
"$GODOT" --headless --path "$DIR" --import >/dev/null 2>&1
OUT="$("$GODOT" --headless --path "$DIR" --script res://tests/run_tests.gd -- "${1:-}" 2>&1)"
echo "$OUT" | grep -v -E "^(Godot Engine|$)"
if echo "$OUT" | grep -q -E "SCRIPT ERROR|Parse Error"; then echo "有腳本錯誤"; exit 1; fi
echo "$OUT" | grep -q -E "^[1-9][0-9]* 項，0 項失敗$" || exit 1
