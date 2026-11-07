#!/bin/bash
# 加拉達橋素材（在使用者的 Mac 上跑，需要 ~/VideoStudio 的 mflux + Anima）。
# 用法：bash tools/art/galata_layers.command
# 背景只用 sunset 那張；其他時段由程式打光（構圖必須一致，見 docs/art-pipeline.md）。
VS="$HOME/VideoStudio"; O="$VS/images/galata"; A="$VS/models/anima-turbo-mflux-q8"; PY="$VS/envs/manim/bin/python"
HERE="$(cd "$(dirname "$0")" && pwd)"
exec > >(tee "$VS/logs/galata_layers.log") 2>&1
export PATH="$HOME/.local/bin:$PATH"; mkdir -p "$O"
PX="pixel art, pixelated, sprite art, retro game screenshot, 16-bit, snes style, limited palette, dithering, hard pixel edges, no anti-aliasing"
NO="no text, no logo, no watermark, no signature, no letters, no ui"
CITY="wide panoramic view of Istanbul across the Golden Horn, Suleymaniye mosque with four tall thin minarets on a hill on the left, a large mosque with many domes near the waterfront in the middle, old city houses covering the hills, Galata Tower with a conical roof on a hill on the right, calm water in the bottom third reflecting the sky, a small white ferry, seagulls, no people, no bridge in the foreground"
mflux-generate-anima --model "$A" --base-model anima-turbo --seed 811 --width 2560 --height 512 \
  --prompt "$PX, $CITY, sunset, the sun touching the hill behind the mosque, orange and pink sky, dark purple silhouettes, $NO" \
  --output "$O/bg_sunset.png" && echo "OK bg_sunset"
SP="single object, centered, full view, side view, game sprite, plain flat solid magenta background, #ff00ff background"
sp() { mflux-generate-anima --model "$A" --base-model anima-turbo --seed "$1" --width 768 --height 768 --prompt "$PX, $2, $SP, $NO" --output "$O/sp_$3.png" && echo "OK sp_$3"; }
sp 821 "a red Turkish street vendor cart piled with sesame bread rings, small glass display case, two wheels" simit
sp 822 "a small wooden boat with a red and blue hull, a man grilling fish on a charcoal grill on the boat, white smoke" boat
sp 823 "a small Turkish tea stall, a two-tier teapot on a tiny stove, tulip-shaped tea glasses on a tray, two low wooden stools" cay
sp 824 "an orange tabby street cat sitting" cat
sp 826 "a man carrying an ornate brass shoe-shine box with a handle, walking, full body" shoe
"$PY" "$HERE/pixelate.py" "$O/bg_sunset.png" "$O/bg_sunset_px.png" 4 32 4
for n in simit:30 cay:36 cat:13 shoe:11; do
  "$PY" "$HERE/key_sprite.py" "$O/sp_${n%%:*}.png" "$O/${n%%:*}.png" "${n##*:}"
done
"$PY" "$HERE/key_sprite.py" "$O/sp_boat.png" "$O/boat.png" 62 --by-width
ls -la "$O"; echo "== DONE =="
