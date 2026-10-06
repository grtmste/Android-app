#!/usr/bin/env python3
"""Generate original, clearly-labelled placeholder images for the demo package.

They're used only until the modafie.io crawl can run; build-demo.mjs swaps in the real
photography from scrape/media automatically.

Usage: python3 make_images.py <out_dir> [accent_hex]
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1])
ACCENT = sys.argv[2] if len(sys.argv) > 2 else "#FF5A1F"
OUT.mkdir(parents=True, exist_ok=True)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def font(size):
    for f in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def compose(name, w, h, seed, tone="dark", label=True):
    rnd = random.Random(seed)
    accent = hex_rgb(ACCENT)
    if tone == "dark":
        top, bottom = rnd.randint(28, 52), rnd.randint(4, 16)
    elif tone == "mid":
        top, bottom = rnd.randint(120, 150), rnd.randint(70, 95)
    else:
        top, bottom = rnd.randint(225, 240), rnd.randint(196, 214)

    # Vertical gradient base (monochrome).
    base = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        base.putpixel((0, y), int(top + (bottom - top) * t))
    img = base.resize((w, h)).convert("RGB")
    draw = ImageDraw.Draw(img, "RGBA")

    # Soft "studio light" ellipses.
    for _ in range(3):
        cx, cy = rnd.uniform(0.2, 0.8) * w, rnd.uniform(0.15, 0.7) * h
        r = rnd.uniform(0.25, 0.55) * max(w, h)
        v = 255 if tone != "light" else 255
        a = rnd.randint(18, 40) if tone == "dark" else rnd.randint(25, 55)
        draw.ellipse((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), fill=(v, v, v, a))
    img = img.filter(ImageFilter.GaussianBlur(max(w, h) / 18))
    draw = ImageDraw.Draw(img, "RGBA")

    # Bold geometric forms: an abstract "figure" made of arcs and bars.
    unit = min(w, h)
    shade = 235 if tone == "dark" else 20
    for i in range(rnd.randint(2, 4)):
        x0 = rnd.uniform(0.1, 0.6) * w
        y0 = rnd.uniform(0.2, 0.6) * h
        ww = rnd.uniform(0.18, 0.4) * unit
        hh = rnd.uniform(0.5, 1.1) * unit
        draw.rounded_rectangle((x0, y0, x0 + ww, y0 + hh), radius=ww / 2, fill=(shade, shade, shade, rnd.randint(22, 48)))
    # Single accent stroke (the one colour).
    ang = rnd.uniform(-0.6, 0.6)
    cx, cy = w * rnd.uniform(0.55, 0.85), h * rnd.uniform(0.25, 0.6)
    length = unit * rnd.uniform(0.5, 0.9)
    dx, dy = math.cos(ang) * length / 2, math.sin(ang) * length / 2
    draw.line((cx - dx, cy - dy, cx + dx, cy + dy), fill=accent + (220,), width=max(6, unit // 40))

    # Fine grain.
    noise = Image.effect_noise((w // 2, h // 2), 18).resize((w, h)).convert("RGB")
    img = Image.blend(img, noise, 0.04)

    if label:
        d = ImageDraw.Draw(img, "RGBA")
        f = font(max(12, unit // 55))
        txt = "PLACEHOLDER IMAGE"
        tw = d.textlength(txt, font=f)
        col = (255, 255, 255, 120) if tone != "light" else (0, 0, 0, 110)
        d.text((w - tw - unit // 30, h - unit // 30 - f.size), txt, font=f, fill=col)

    img.save(OUT / name, "JPEG", quality=78, optimize=True, progressive=True)
    return name


SPECS = [
    ("hero-home.jpg", 2400, 1350, "dark"),
    ("hero-home-mobile.jpg", 1080, 1600, "dark"),
    ("hero-about.jpg", 2400, 1200, "mid"),
    ("hero-collections.jpg", 2400, 1100, "dark"),
    ("editorial-1.jpg", 2400, 1200, "dark"),
    ("editorial-2.jpg", 2400, 1200, "mid"),
    ("split-1.jpg", 1400, 1750, "light"),
    ("split-2.jpg", 1400, 1750, "mid"),
    ("split-3.jpg", 1400, 1750, "dark"),
]
SPECS += [(f"tile-{i}.jpg", 1200, 1600, ["dark", "mid", "dark", "mid"][i - 1]) for i in range(1, 5)]
SPECS += [(f"card-{i}.jpg", 800, 1000, ["light", "mid", "light", "dark", "light", "mid", "light", "dark"][i - 1]) for i in range(1, 9)]

for i, (name, w, h, tone) in enumerate(SPECS):
    compose(name, w, h, seed=i * 7919 + 13, tone=tone)
print(f"wrote {len(SPECS)} images to {OUT}")
