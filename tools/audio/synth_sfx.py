"""合成開場用的音效（Undertale 風格的短音效，不需要任何素材授權）。

用法：~/VideoStudio/envs/manim/bin/python tools/audio/synth_sfx.py [--out game/audio/sfx]
輸出 44.1 kHz 16-bit 單聲道 wav。固定亂數種子：重跑結果一樣。
"""
import argparse
import os
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(20261108)


def t(sec: float) -> np.ndarray:
    return np.arange(int(SR * sec)) / SR


def env(n: int, attack: float = 0.005, release: float = 0.05) -> np.ndarray:
    """起音、釋音的音量包絡（秒）"""
    e = np.ones(n)
    a, r = int(SR * attack), int(SR * release)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def square(freq, x, duty=0.5):
    return np.where((x * freq) % 1.0 < duty, 1.0, -1.0)


def tri(freq, x):
    return 2 * np.abs(2 * ((x * freq) % 1.0) - 1) - 1


def noise(n):
    return rng.uniform(-1, 1, n)


def lowpass(sig, a=0.2):
    out = np.empty_like(sig)
    y = 0.0
    for i, s in enumerate(sig):
        y += a * (s - y)
        out[i] = y
    return out


def blip(freq):
    x = t(0.045)
    return square(freq, x, 0.5) * env(len(x), 0.002, 0.02) * 0.35


def step(k):
    x = t(0.07)
    s = lowpass(noise(len(x)), 0.08 + 0.02 * k) * np.exp(-x * 60)
    return s * 1.6


def door(opening):
    x = t(0.35)
    creak = tri(180 + 60 * np.sin(x * 9) * (1 if opening else -1), x) * 0.15 * env(len(x), 0.02, 0.15)
    thud = lowpass(noise(len(x)), 0.05) * np.exp(-((x - (0.28 if not opening else 0.05)) ** 2) / 0.0008) * 2.0
    return creak + thud


def tone_seq(notes, dur=0.06, wave_fn=square, vol=0.3):
    parts = []
    for f in notes:
        x = t(dur)
        parts.append(wave_fn(f, x) * env(len(x), 0.002, 0.02) * vol)
    return np.concatenate(parts)


def dice():
    parts = []
    for i in range(7):
        x = t(0.03 + i * 0.008)
        parts.append(lowpass(noise(len(x)), 0.3) * env(len(x), 0.001, 0.02) * 0.6)
        parts.append(np.zeros(int(SR * 0.02)))
    return np.concatenate(parts)


def page_flip():
    x = t(0.25)
    return lowpass(noise(len(x)), 0.35) * np.sin(np.pi * x / x[-1]) ** 2 * 0.5


def shutter():
    x = t(0.12)
    click = lowpass(noise(len(x)), 0.6) * (np.exp(-x * 120) + np.exp(-np.maximum(x - 0.07, 0) * 160) * (x > 0.07))
    return click * 0.9


def stamp():
    x = t(0.2)
    return (lowpass(noise(len(x)), 0.04) * 2.5 + np.sin(2 * np.pi * 80 * x) * 0.5) * np.exp(-x * 25)


def zipper():
    x = t(0.4)
    teeth = (np.sin(2 * np.pi * 70 * x * (1 + x)) > 0.6).astype(float)
    return lowpass(noise(len(x)), 0.5) * teeth * 0.5 * env(len(x), 0.01, 0.05)


def day_card():
    a = tone_seq([523, 659, 784], 0.07, tri, 0.35)
    x = t(0.3)
    tail = tri(1046, x) * np.exp(-x * 9) * 0.3
    return np.concatenate([a, tail])


SOUNDS = {
    "blip_low": lambda: blip(220), "blip_mid": lambda: blip(330), "blip_high": lambda: blip(440),
    "step_1": lambda: step(0), "step_2": lambda: step(1), "step_3": lambda: step(2), "step_4": lambda: step(3),
    "door_open": lambda: door(True), "door_close": lambda: door(False),
    "select": lambda: tone_seq([880], 0.035), "confirm": lambda: tone_seq([660, 990], 0.05),
    "cancel": lambda: tone_seq([440, 330], 0.05), "dice": dice,
    "check_win": lambda: tone_seq([523, 659, 784, 1046], 0.08, tri, 0.35),
    "check_lose": lambda: tone_seq([392, 330, 262], 0.12, tri, 0.35),
    "page_flip": page_flip, "phone_tap": lambda: tone_seq([1200], 0.025, tri, 0.25),
    "shutter": shutter, "stamp": stamp, "zipper": zipper, "day_card": day_card,
}


def write(path: str, sig: np.ndarray) -> None:
    sig = np.clip(sig, -1, 1)
    data = (sig * 32767 * 0.9).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "game", "audio", "sfx"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for name, fn in SOUNDS.items():
        write(os.path.join(a.out, name + ".wav"), fn())
    print(f"wrote {len(SOUNDS)} sounds to {a.out}")


if __name__ == "__main__":
    main()
