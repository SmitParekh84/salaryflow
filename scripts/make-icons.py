"""
Regenerate the Aartha icon set.

The source marks already carry a real alpha channel, so they are used exactly
as supplied — no keying, no trimming, no re-deriving transparency. They are
only padded to 1:1 and resized. Nothing is cropped.

Sources:
* BRAND_MARK — green glow mark, shown beside the wordmark in the app.
* FAVICON    — blue glow mark, used for browser favicons.
* TILE       — finished rounded app tile for PWA / apple-touch icons.

Run: python scripts/make-icons.py
"""

from PIL import Image

BRAND_MARK = "C:/Users/LENOVO/Downloads/aartha.png"
FAVICON = "C:/Users/LENOVO/Downloads/ChatGPT Image Aug 11, 2026, 02_06_35 PM.png"
TILE = "C:/Users/LENOVO/Downloads/app new.png"
OUT = "public/icons"


def to_square(im):
    """Pad to 1:1 on a transparent canvas. Never crops."""
    im = im.convert("RGBA")
    side = max(im.size)
    if im.size == (side, side):
        return im
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    return canvas


def emit(im, targets, label):
    for name, size in targets:
        im.resize((size, size), Image.LANCZOS).save(f"{OUT}/{name}", "PNG", optimize=True)
        print(f"{label:11}", name, size)


tile = to_square(Image.open(TILE))
emit(
    tile,
    [
        ("icon-master.png", 1024),
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("apple-touch-icon.png", 180),
    ],
    "app tile:",
)

favicon = to_square(Image.open(FAVICON))
emit(
    favicon,
    [("favicon-64.png", 64), ("favicon-32.png", 32), ("favicon-16.png", 16)],
    "favicon:",
)

mark = to_square(Image.open(BRAND_MARK))
emit(mark, [("brand-mark.png", 256), ("logo-mark.png", 512)], "brand mark:")
