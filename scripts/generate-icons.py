"""Generate PWA icons from the PMK logo. Every output is a DOWNscale of the 500x500 source.

Usage: python3 scripts/generate-icons.py <path-to-PMK_LOGO.png>
"""
import sys
from pathlib import Path
from PIL import Image

src = Image.open(sys.argv[1]).convert("RGBA")
bbox = src.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
logo = src.crop(bbox)
side = max(logo.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
print("trimmed logo:", logo.size, "-> square", side)

CREAM = (248, 247, 246, 255)
out = Path("public")

def tile(size, logo_fraction, bg):
    target = round(size * logo_fraction)
    assert target <= side, f"would upscale: {target} > {side}"
    canvas = Image.new("RGBA", (size, size), bg)
    mark = square.resize((target, target), Image.LANCZOS)
    canvas.alpha_composite(mark, ((size - target) // 2, (size - target) // 2))
    return canvas

# "any" icons: opaque cream tile, seal fills 88%.
tile(192, 0.88, CREAM).save(out / "icons/icon-192.png", optimize=True)
tile(512, 0.88, CREAM).save(out / "icons/icon-512.png", optimize=True)
# maskable: seal inside the 80% safe-zone circle (72% leaves margin for round masks).
tile(512, 0.72, CREAM).save(out / "icons/maskable-512.png", optimize=True)
tile(192, 0.72, CREAM).save(out / "icons/maskable-192.png", optimize=True)
# iOS composites transparency onto black, so the apple-touch-icon must be opaque.
tile(180, 0.86, CREAM).convert("RGB").save(out / "icons/apple-touch-icon.png", optimize=True)
# Logo for Login/Settings: transparent, trimmed, 400px (displayed at <=120 CSS px, so 3x).
square.resize((min(side, 400),) * 2, Image.LANCZOS).save(out / "brand/pmk-logo.png", optimize=True)
# Favicon
tile(48, 0.94, (0, 0, 0, 0)).save("src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("done")
