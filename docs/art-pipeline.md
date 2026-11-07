# 美術流程

## 工具

使用者的 Mac（M1 Max、32 GB）上的 `~/VideoStudio`：

- 生圖：`mflux-generate-anima`，模型 `~/VideoStudio/models/anima-turbo-mflux-q8`（使用者偏好 Anima，像素和動畫風比較好）。
- Python：`~/VideoStudio/envs/manim/bin/python`（有 numpy、Pillow）。
- 生圖不能在雲端環境跑，也不能在 Claude 桌面 app 的 Linux 沙盒跑（mflux 需要 macOS 的 GPU）。

## 跑一次

在 Mac 的終端機：

```bash
bash ~/path/to/liver-red/tools/art/galata_layers.command   # ［可逆變更］只會寫入 ~/VideoStudio/images/galata/
```

輸出在 `~/VideoStudio/images/galata/`，紀錄在 `~/VideoStudio/logs/galata_layers.log`。確認滿意後，把成品複製到 `assets/scenes/galata/`。

## 規則

1. **同一場景只用一張底圖**。不同時段由程式打光（`src/render/lighting.js`、場景的 `art.js`）。不要用三張不同時段的生成圖交叉淡化：Anima 每次的構圖都不一樣，建築會「變形」。
2. 如果需要更寫實的時段版本，用同一張底圖做**圖生圖**，低強度，只改光影。
3. 近景必須吃同一套光線參數（`gradeForeground`），不然會像兩個圖層。
4. 道具生成在**洋紅底**（#ff00ff）上，用 `tools/art/key_sprite.py` 去背、縮到場景尺寸、收色。它從四邊 flood fill，物件內部的紫色不會被挖掉。
5. 場景解析度是高 320 像素，畫完用最近鄰放大。道具的目標高度：攤販推車約 30、茶攤 36、貓 13、擦鞋箱 11、船寬 62。
6. 背景：2560×512 生成，`pixelate.py` 4 格、32 色，取 `_1x`（640×128），遊戲裡放大 2 倍。

## Godot 版的家（2026-11）

```bash
bash tools/art/home/make_home_images.command          # 生成（房間：Anima；角色、頭像：gpt-image-2.5）
~/VideoStudio/envs/manim/bin/python tools/art/make_home.py   # 後處理 → game/art/
```

- 房間四張（房間、客廳、飯廳＋大門、樓梯間）各縮到高 200、真像素化，左右拼成一條 2200 寬的家（`game/art/home/home_strip.png`）。家具的位置寫在 `game/data/home.json`，換圖之後要照圖重新對齊。
- 角色表和頭像用 gpt-image-2.5 生成（同一張圖裡角色比較一致），洋紅底自動切格、去背：主角身高 72、頭像 48×48。
- 呼叫 OpenAI 用 `tools/art/gen_openai.sh`（curl，不需要 Python 的 openai 套件）。會花錢。

## 已知問題

- 寬幅（5:1）生成時，Anima 偶爾會重複建築；發生時改成左右兩半分別生成再接。
- Anima 不一定守住純洋紅底；背景太雜的圖要重生。
- 人物和釣客還是程式畫的，跟生成的背景畫風有落差。下一步：生成全身路人、釣客、玩家 sprite，每個角色兩張走路影格。
- 夕陽圖裡的太陽在入夜時用色塊蓋掉，最左邊還留一點痕跡。
