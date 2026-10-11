"""Generate app icons without altering the supplied artwork.
Run with Python + Pillow: python scripts/generate_icons.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
source = Image.open(PUBLIC / "branding/ching-official.png").convert("RGB")
assert source.width == source.height, "Official source must be square"
for size in (16, 32, 48):
    source.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / f"favicon-{size}x{size}.png")
source.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], bitmap_format="png")
for size in (180, 152, 167):
    name = "apple-touch-icon.png" if size == 180 else f"apple-touch-icon-{size}x{size}.png"
    source.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / name)
for size in (192, 512):
    source.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / f"android-chrome-{size}x{size}.png")
    # A square at 55% fits entirely inside the guaranteed 40%-radius circle.
    side = round(size * .55)
    safe = Image.new("RGB", (size, size), "#fffdf3")
    safe.paste(source.resize((side, side), Image.Resampling.LANCZOS), ((size-side)//2, (size-side)//2))
    safe.save(PUBLIC / f"maskable-icon-{size}x{size}.png")
print("Generated favicons, Apple touch icons, Android/PWA icons, and safe-area maskable icons.")
