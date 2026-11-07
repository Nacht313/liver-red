#!/bin/bash
# Godot 版「家」的生成圖（在使用者的 Mac 上跑）。輸出：~/VideoStudio/images/liver-home/
# 房間用本機 Anima（免費）；角色和頭像用 gpt-image-2.5（要錢，金鑰在環境變數 OPENAI_API_KEY）。
# 生成完再跑：~/VideoStudio/envs/manim/bin/python tools/art/make_home.py
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; O="$HOME/VideoStudio/images/liver-home"; A="$HOME/VideoStudio/models/anima-turbo-mflux-q8"
export PATH="$HOME/.local/bin:$PATH"; mkdir -p "$O"; cd "$O"
PX="pixel art, pixelated, sprite art, retro game screenshot, 16-bit, snes style, limited palette, hard pixel edges, no anti-aliasing"
NO="no text, no logo, no watermark, no letters, no ui, no people"
g() { mflux-generate-anima --model "$A" --base-model anima-turbo --seed "$1" --width "$2" --height 512 --prompt "$PX, $3, $NO" --output "$4"; }
g 901 1536 "side view cross-section of a small bedroom in an old Chinese city apartment, flat front view like a 2D platformer, wooden floor at the bottom, single bed with a thin blanket on the left, a big empty hiking backpack leaning on the wall, a desk with a desktop computer and monitor, a framed graduation photo on the wall, a window in the right part of the wall, a bookshelf on the far right, daylight, warm cozy but slightly shabby" bedroom_v1.png
g 902 1536 "side view cross-section of the living room of an old Chinese city apartment, flat front view like a 2D platformer, same green walls and wooden floor, an old CRT style television on a low cabinet on the left, a worn brown sofa in the middle, framed certificates and a calendar on the wall on the right, a potted plant, daylight" living_v1.png
g 913 1536 "side view cross-section of a small dining room and kitchen of an old Chinese city apartment, flat front view like a 2D platformer, green walls and wooden floor, a white fridge with paper notes on the left, a round wooden dining table with a checkered tablecloth and stools in the middle, a kitchen counter with a rice cooker, on the far right a dark metal apartment entrance door with a red decoration, daylight" dining_v1_1.png
g 904 1024 "side view cross-section of the stairwell outside an old Chinese apartment, flat front view like a 2D platformer, concrete steps going down to the right, peeling paint walls covered with small paper advertisements, a neighbor's metal door on the left, a row of parcel lockers at the bottom right, dim fluorescent light, daylight from a small window" stairwell_v1.png
bash "$HERE/../gen_openai.sh" "$HERE/chars_prompt.txt" chars_v1.png 1536x1024
bash "$HERE/../gen_openai.sh" "$HERE/faces_prompt.txt" faces_v1.png 1536x1024
echo "== DONE =="
