"""真像素化：每格取「多數色」而不是平均色，邊緣不會糊；再收斂到固定色數。
用法：pixelate.py 輸入.png 輸出.png [格子px=5] [顏色數=24] [輸出放大倍數=格子px]
同時輸出 *_1x.png（原始像素尺寸，遊戲素材用）。"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 5
ncol = int(sys.argv[4]) if len(sys.argv) > 4 else 24
scale = int(sys.argv[5]) if len(sys.argv) > 5 else cell
im = Image.open(src).convert("RGB")
w, h = (im.width // cell) * cell, (im.height // cell) * cell
im = im.crop((0, 0, w, h))
# 1) 全圖收斂成 ncol 色（不抖色）
q = im.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
pal = np.array(q.getpalette()[: ncol * 3], dtype=np.uint8).reshape(-1, 3)
idx = np.array(q)
# 2) 每個格子取出現最多的顏色
gh, gw = h // cell, w // cell
blocks = idx.reshape(gh, cell, gw, cell).transpose(0, 2, 1, 3).reshape(gh, gw, cell * cell)
out = np.zeros((gh, gw), dtype=np.int64)
for y in range(gh):
    for x in range(gw):
        out[y, x] = np.bincount(blocks[y, x], minlength=ncol).argmax()
small = Image.fromarray(pal[out])
small.save(dst.replace(".png", "_1x.png"))
small.resize((gw * scale, gh * scale), Image.NEAREST).save(dst)
print("pixel:", dst, f"{gw}x{gh} grid, {ncol} colors")
