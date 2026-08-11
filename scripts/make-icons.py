"""
Regenerate the Aartha icon set and the transparent logo mark.

Two sources:

* `app new.png` — the finished rounded app tile, rendered on black with no
  alpha. Full-bleed variants crop inside the corner arc rather than filling
  behind it: compositing the tile over a synthetic gradient left a visible
  edge, because a generated ramp never matches the artwork's own background.
  iOS and Android re-mask these anyway, so black corners would show as slivers.
* `8.png` — the glowing mark on black. Bright art on pure black is the same as
  the mark already composited over black, so straight alpha is recovered by
  taking the per-pixel channel maximum and dividing the colour through by it.
  Threshold keying would leave a hard, aliased black rim.
"""

from PIL import Image

TILE = "C:/Users/LENOVO/Downloads/app new.png"
GLOW = "C:/Users/LENOVO/.claude/image-cache/0a3232dc-c7c6-4c4d-9162-2f3ddf4a5695/8.png"
OUT = "C:/projects/Expencs/public/icons"


def unpremultiply_over_black(path):
    """Recover straight RGBA from artwork drawn on solid black."""
    im = Image.open(path).convert("RGB")
    px = im.load()
    out = Image.new("RGBA", im.size)
    op = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            a = max(r, g, b)
            if a == 0:
                op[x, y] = (0, 0, 0, 0)
            else:
                s = 255.0 / a
                op[x, y] = (min(255, int(r * s)), min(255, int(g * s)), min(255, int(b * s)), a)
    return out


def trim(im, threshold=6):
    box = im.getchannel("A").point(lambda v: 255 if v > threshold else 0).getbbox()
    return im.crop(box) if box else im


# --- App tile -------------------------------------------------------------

src = Image.open(TILE).convert("RGB")
tile_rgba = unpremultiply_over_black(TILE)
bbox = tile_rgba.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
tile = src.crop(bbox)

rounded = tile_rgba.crop(bbox)

# Crop inside the corner arc so the full-bleed variants carry no black.
inset = round(min(tile.size) * 0.075)
full = tile.crop((inset, inset, tile.width - inset, tile.height - inset))
side = min(full.size)
full = full.crop((0, 0, side, side))

FULL_BLEED = [
    ("icon-master.png", 1024),
    ("icon-512.png", 512),
    ("icon-192.png", 192),
    ("apple-touch-icon.png", 180),
]
ROUNDED = [("favicon-64.png", 64), ("favicon-32.png", 32), ("favicon-16.png", 16)]

for name, size in FULL_BLEED:
    full.resize((size, size), Image.LANCZOS).save(f"{OUT}/{name}", "PNG", optimize=True)
    print("full-bleed:", name, size)

for name, size in ROUNDED:
    rounded.resize((size, size), Image.LANCZOS).save(f"{OUT}/{name}", "PNG", optimize=True)
    print("rounded:   ", name, size)

# --- Transparent logo mark ------------------------------------------------


def black_to_alpha(path):
    """Turn the black surround transparent, keeping colour untouched.

    Deliberately does NOT un-premultiply. This artwork is mostly soft glow, so
    large regions sit at an alpha of 1-5; dividing the colour through by that
    amplifies 8-bit quantisation noise into saturated speckle. Keeping the
    premultiplied colour renders correctly over dark surfaces, which is where
    the mark is used, and carries no artefacts anywhere.
    """
    im = Image.open(path).convert("RGB")
    px = im.load()
    out = Image.new("RGBA", im.size)
    op = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            op[x, y] = (r, g, b, max(r, g, b))
    return out


mark = trim(black_to_alpha(GLOW), threshold=4)
mark.save(f"{OUT}/logo-mark.png", "PNG", optimize=True)
print("logo-mark.png:", mark.size, "transparent")

lo, hi = mark.getchannel("A").getextrema()
print("mark alpha extrema:", lo, hi)

corner = full.convert("RGB").getpixel((2, 2))
print("full-bleed corner pixel:", corner, "(should not be near-black)")
