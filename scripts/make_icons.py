"""
Generates simple placeholder PWA icons (a maroon rounded square with a bell
glyph) so the app is installable out of the box. Swap these in
public/icons/ for GAI's real logo whenever you like -- keep the same
filenames and sizes and nothing else needs to change.
"""
from PIL import Image, ImageDraw

BRAND = (122, 31, 43)  # matches --brand in app/globals.css
WHITE = (255, 255, 255)

def bell_path(size, scale=0.55):
    # Simple bell silhouette drawn as a polygon, centered.
    cx, cy = size / 2, size / 2
    r = size * scale / 2
    points = []
    # bell body (a rounded triangle-ish shape) approximated with an ellipse arc + base
    return cx, cy, r

def draw_icon(path, size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if maskable:
        # Maskable icons must fill the full square (no transparent corners)
        # and keep key content inside a safe center zone.
        draw.rectangle([0, 0, size, size], fill=BRAND)
        pad = size * 0.18
    else:
        radius = size * 0.22
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BRAND)
        pad = size * 0.08

    # Bell glyph
    cx = size / 2
    top = pad + size * 0.06
    bottom = size - pad - size * 0.14
    width_top = size * 0.10
    width_bottom = size * 0.34

    bell_body = [
        (cx, top),
        (cx - width_bottom, bottom),
        (cx + width_bottom, bottom),
    ]
    # Rounded top via ellipse, body via polygon, base line, clapper circle
    draw.ellipse(
        [cx - width_top * 2.1, top - width_top * 0.4, cx + width_top * 2.1, top + width_top * 2.4],
        fill=WHITE,
    )
    draw.polygon(
        [
            (cx - width_top * 2.1, top + width_top * 1.0),
            (cx + width_top * 2.1, top + width_top * 1.0),
            (cx + width_bottom, bottom),
            (cx - width_bottom, bottom),
        ],
        fill=WHITE,
    )
    draw.rounded_rectangle(
        [cx - width_bottom * 1.15, bottom, cx + width_bottom * 1.15, bottom + size * 0.045],
        radius=size * 0.02,
        fill=WHITE,
    )
    clapper_r = size * 0.045
    draw.ellipse(
        [cx - clapper_r, bottom + size * 0.06, cx + clapper_r, bottom + size * 0.06 + clapper_r * 2],
        fill=WHITE,
    )

    img.save(path)

sizes = {
    "icon-192.png": (192, False),
    "icon-512.png": (512, False),
    "icon-192-maskable.png": (192, True),
    "icon-512-maskable.png": (512, True),
    "apple-touch-icon.png": (180, False),
}

import os
os.makedirs("public/icons", exist_ok=True)
for filename, (size, maskable) in sizes.items():
    draw_icon(f"public/icons/{filename}", size, maskable)

# Monochrome badge for the notification tray (small, simple).
badge = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
d = ImageDraw.Draw(badge)
d.ellipse([4, 4, 68, 68], fill=BRAND)
d.ellipse([26, 18, 46, 38], fill=WHITE)
d.polygon([(20, 40), (52, 40), (44, 54), (28, 54)], fill=WHITE)
badge.save("public/icons/badge-72.png")

print("Icons written to public/icons/")
