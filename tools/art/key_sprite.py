"""把 Anima 生成的道具圖（洋紅底）去背、裁切、縮到場景尺寸、收色。

用法：key_sprite.py 原圖.png 輸出.png 目標高度 [--by-width] [--colors 14]

做法：
1. 從四邊往內 flood fill，只吃掉「跟邊框背景相連」的洋紅色，物件內部的紫色不會被挖掉。
2. 再補吃被物件包住、而且非常接近背景色的洋紅（例如把手圍起來的洞）。
3. 用預乘 alpha 的 box 縮圖，再收成固定色數、alpha 二值化，邊緣才是乾淨的像素。
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('target', type=int)
ap.add_argument('--by-width', action='store_true'); ap.add_argument('--colors', type=int, default=14)
a = ap.parse_args()

px = np.array(Image.open(a.src).convert('RGB')).astype(int)
h, w, _ = px.shape
border = np.concatenate([px[0], px[-1], px[:, 0], px[:, -1]])
ref = np.median(border, axis=0)
rgb = px / 255.0
mx, mn = rgb.max(2), rgb.min(2)
d = np.maximum(mx - mn, 1e-6)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
magenta = (hue > 290) & (hue < 350) & (sat > 0.35) & (g < 0.45)
cand = magenta | (np.abs(px - ref).sum(2) < 90)

bg = np.zeros((h, w), bool)
q = deque()
for y in range(h):
    for x in (0, w - 1):
        if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
for x in range(w):
    for y in (0, h - 1):
        if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bg[ny, nx]:
            bg[ny, nx] = True; q.append((ny, nx))
bg |= magenta & (np.abs(px - ref).sum(2) < 70)

alpha = np.where(bg, 0, 255).astype(np.uint8)
ys, xs = np.where(alpha > 0)
y0, y1 = int(np.percentile(ys, 0.3)), int(np.percentile(ys, 99.7)) + 1
x0, x1 = int(np.percentile(xs, 0.3)), int(np.percentile(xs, 99.7)) + 1
img = np.dstack([px.astype(np.uint8), alpha])[y0:y1, x0:x1]
ih, iw = img.shape[:2]
if a.by_width: tw, th = a.target, max(1, round(ih * a.target / iw))
else: th, tw = a.target, max(1, round(iw * a.target / ih))

arr = img.astype(float)
pm = arr[..., :3] * arr[..., 3:4] / 255
P = np.array(Image.fromarray(pm.astype(np.uint8)).resize((tw, th), Image.BOX)).astype(float)
A = np.array(Image.fromarray(arr[..., 3].astype(np.uint8)).resize((tw, th), Image.BOX)).astype(float)
col = np.where(A[..., None] > 0, P * 255 / np.maximum(A[..., None], 1), 0).clip(0, 255).astype(np.uint8)
qd = Image.fromarray(col).quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
Image.fromarray(np.dstack([np.array(qd), np.where(A > 110, 255, 0).astype(np.uint8)]), 'RGBA').save(a.dst)
print('sprite:', a.dst, tw, 'x', th)
