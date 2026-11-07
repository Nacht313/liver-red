"""家的美術後處理：生成圖 → 遊戲素材（game/art/）。在 Mac 上用 ~/VideoStudio/envs/manim/bin/python 跑。

用法：python tools/art/make_home.py [生成圖資料夾=~/VideoStudio/images/liver-home]

1. 房間：四張生成圖各自縮到高 200、真像素化（每格取多數色、收色），左右拼成一條家（game/art/home/home_strip.png）。
   同一場景只用一張底圖，時段由 Godot 打光（CLAUDE.md 第 2 條）。
2. 角色：角色表（洋紅底）自動找出每一格人物，去背、縮到固定身高（game/art/chars/<角色>_<n>.png）。
3. 頭像：四張頭像去背、縮成 48×48（game/art/faces/<角色>.png）。
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/VideoStudio/images/liver-home")
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "game", "art")
ROOM_H = 200
# 房間：生成圖、輸出寬度（拼接順序就是家從左到右）
ROOMS = [("bedroom_v1.png", 600), ("living_v1.png", 600), ("dining_v1_1.png", 600), ("stairwell_v1.png", 400)]
CHAR_H = 72      # 主角和家人的身高（像素）
FACE = 48


def pixelate(im: Image.Image, w: int, h: int, colors: int = 48) -> Image.Image:
    """縮到 2 倍大小後，每 2×2 格取多數色，再收成固定色數：邊緣不糊。"""
    big = im.convert("RGB").resize((w * 2, h * 2), Image.LANCZOS)
    q = big.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: colors * 3], dtype=np.uint8).reshape(-1, 3)
    idx = np.array(q).reshape(h, 2, w, 2).transpose(0, 2, 1, 3).reshape(h, w, 4)
    out = np.zeros((h, w), dtype=np.int64)
    for y in range(h):
        for x in range(w):
            out[y, x] = np.bincount(idx[y, x], minlength=colors).argmax()
    return Image.fromarray(pal[out])


def magenta_mask(px: np.ndarray) -> np.ndarray:
    """跟邊框相連的洋紅色（背景）＝ True。"""
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    near = (r > 170) & (b > 170) & (g < 110) & (abs(r - b) < 90)
    h, w = near.shape
    seen = np.zeros_like(near)
    q = deque([(y, x) for y in (0, h - 1) for x in range(w)] + [(y, x) for x in (0, w - 1) for y in range(h)])
    while q:
        y, x = q.popleft()
        if 0 <= y < h and 0 <= x < w and near[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.extend([(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)])
    return seen | (near & (g < 60))  # 被包住、非常純的洋紅也算背景


def segments(occupied: np.ndarray, min_gap: int = 6, min_len: int = 12) -> list:
    """一維：連續有東西的區段 [(a, b), ...]"""
    out, start, gap = [], None, 0
    for i, v in enumerate(occupied):
        if v:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap > min_gap:
                if i - gap - start >= min_len:
                    out.append((start, i - gap + 1))
                start, gap = None, 0
    if start is not None:
        out.append((start, len(occupied)))
    return out


def cut_sprites(path: str) -> list:
    """角色表 → 每一格人物（RGBA，已去背、裁到邊）。由上到下、由左到右。"""
    im = Image.open(path).convert("RGB")
    px = np.array(im)
    fg = ~magenta_mask(px)
    out = []
    for y0, y1 in segments(fg.any(axis=1), min_gap=20, min_len=40):
        band = fg[y0:y1]
        for x0, x1 in segments(band.any(axis=0), min_gap=8, min_len=20):
            m = band[:, x0:x1]
            ys = np.where(m.any(axis=1))[0]
            a, b = y0 + ys[0], y0 + ys[-1] + 1
            rgba = np.dstack([px[a:b, x0:x1], (fg[a:b, x0:x1] * 255).astype(np.uint8)])
            out.append(Image.fromarray(rgba, "RGBA"))
    return out


def shrink_sprite(sp: Image.Image, height: int, colors: int = 20) -> Image.Image:
    """預乘 alpha 縮小、alpha 二值化、收色。"""
    w = max(1, round(sp.width * height / sp.height))
    arr = np.array(sp).astype(float) / 255
    arr[..., :3] *= arr[..., 3:4]
    small = Image.fromarray((arr * 255).astype(np.uint8), "RGBA").resize((w, height), Image.BOX)
    s = np.array(small).astype(float)
    a = s[..., 3:4] / 255
    rgb = np.where(a > 0, s[..., :3] / np.maximum(a, 1e-6), 0).clip(0, 255).astype(np.uint8)
    q = Image.fromarray(rgb).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    alpha = ((s[..., 3] > 110) * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(q), alpha]), "RGBA")


def main() -> None:
    for d in ("home", "chars", "faces"):
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)
    strip = Image.new("RGB", (sum(w for _, w in ROOMS), ROOM_H))
    x = 0
    for name, w in ROOMS:
        strip.paste(pixelate(Image.open(os.path.join(SRC, name)), w, ROOM_H), (x, 0))
        x += w
    strip.save(os.path.join(ROOT, "home", "home_strip.png"))
    print("home_strip.png", strip.size)

    sprites = cut_sprites(os.path.join(SRC, "chars_v1.png"))
    print("角色格數：", len(sprites))
    names = ["me_walk_0", "me_walk_1", "me_walk_2", "me_walk_3", "me_idle", "mom_0", "mom_1", "dad_0", "dad_1", "neighbor_0", "neighbor_1"]
    for n, sp in zip(names, sprites):
        h = CHAR_H if n.startswith("me") else (CHAR_H - 4 if n.startswith("mom") else CHAR_H)
        shrink_sprite(sp, h).save(os.path.join(ROOT, "chars", n + ".png"))

    faces = cut_sprites(os.path.join(SRC, "faces_v1.png"))
    print("頭像數：", len(faces))
    for n, sp in zip(["me", "mom", "dad", "neighbor"], faces):
        side = max(sp.width, sp.height)
        sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        sq.paste(sp, ((side - sp.width) // 2, side - sp.height))
        shrink_sprite(sq, FACE, colors=24).save(os.path.join(ROOT, "faces", n + ".png"))


if __name__ == "__main__":
    main()
