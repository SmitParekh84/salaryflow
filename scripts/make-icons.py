"""
Regenerate the Aartha icon set.

The source marks already carry a real alpha channel, so they are used exactly
as supplied — no keying, no trimming, no re-deriving transparency. They are
only padded to 1:1 and resized. Nothing is cropped.

Sources:
* MARK — transparent logo mark, used beside the wordmark in the app.
* TILE — finished rounded app tile, used for PWA, Apple, and browser icons.

Run: python scripts/make-icons.py
"""

from PIL import Image

MARK = "C:/Users/LENOVO/Downloads/new icon.png"
TILE = "C:/Users/LENOVO/Downloads/app icon.png"
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

emit(
    tile,
    [("favicon-64.png", 64), ("favicon-32.png", 32), ("favicon-16.png", 16)],
    "favicon:",
)
tile.resize((512, 512), Image.LANCZOS).save(
    f"{OUT}/favicon.ico",
    "ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print("favicon:   ", "favicon.ico", "16-256 (512 source)")

mark = to_square(Image.open(MARK))
emit(mark, [("brand-mark.png", 256), ("logo-mark.png", 512)], "brand mark:")
