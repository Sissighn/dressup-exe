"""Generates the macOS app icon in the brutalist style of the app UI.

The icon reuses the building blocks of the interface: a sharp-cornered panel
with a heavy black border, a hard offset colour block behind it (no blur), a
yellow header bar, and the app palette from frontend/src/App.css.
"""

import math
import os
import sys

from PIL import Image, ImageDraw

SIZE = 1024
SCALE = 4  # Supersampling; edges are downsampled at the end.

WHITE = (255, 255, 255, 255)
INK = (26, 26, 26, 255)        # --text-main
YELLOW = (232, 212, 137, 255)  # --accent-yellow
PINK = (230, 184, 184, 255)    # --accent-pink

CARD = (92, 74, 866, 848)
OFFSET = 62
BORDER = 20
BAR_HEIGHT = 118


def scaled(box):
    return [value * SCALE for value in box]


def draw_dress(draw, top, bottom, center_x, shoulder_w, hem_w, background):
    """A-line dress. Without the neckline the silhouette reads as a funnel,
    so it is cut back out of the shoulder line."""
    height = bottom - top
    waist_y = top + height * 0.46
    shoulder, hem_half = shoulder_w / 2, hem_w / 2
    waist = shoulder * 0.74

    hem = []
    for step in range(33):
        t = step / 32
        hem.append((center_x - hem_half + t * hem_w,
                    bottom + height * 0.055 * math.sin(math.pi * t)))

    outline = ([(center_x - shoulder, top), (center_x + shoulder, top),
                (center_x + waist, waist_y), (center_x + hem_half, bottom)]
               + hem[::-1]
               + [(center_x - hem_half, bottom), (center_x - waist, waist_y)])
    draw.polygon([(x * SCALE, y * SCALE) for x, y in outline], fill=INK)

    neck_w, neck_h = shoulder_w * 0.56, height * 0.115
    draw.pieslice(
        scaled((center_x - neck_w / 2, top - neck_h,
                center_x + neck_w / 2, top + neck_h)),
        start=0, end=180, fill=background,
    )


def build_icon() -> Image.Image:
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Offset accent block behind the panel - the signature of the UI.
    draw.rectangle(
        scaled((CARD[0] + OFFSET, CARD[1] + OFFSET,
                CARD[2] + OFFSET, CARD[3] + OFFSET)),
        fill=PINK,
    )
    draw.rectangle(scaled(CARD), fill=WHITE, outline=INK, width=BORDER * SCALE)

    x0, y0 = CARD[0] + BORDER, CARD[1] + BORDER
    x1, y1 = CARD[2] - BORDER, CARD[3] - BORDER

    # Yellow header bar, as on the product-preview card.
    draw.rectangle(scaled((x0, y0, x1, y0 + BAR_HEIGHT)), fill=YELLOW)
    draw.rectangle(
        scaled((x0, y0 + BAR_HEIGHT, x1, y0 + BAR_HEIGHT + BORDER // 2)),
        fill=INK,
    )

    draw_dress(
        draw,
        top=y0 + BAR_HEIGHT + 128,
        bottom=y1 - 104,
        center_x=(x0 + x1) / 2,
        shoulder_w=246,
        hem_w=430,
        background=WHITE,
    )

    return image.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> int:
    iconset_dir = sys.argv[1]
    os.makedirs(iconset_dir, exist_ok=True)
    icon = build_icon()

    # Exactly the sizes iconutil expects in an .iconset.
    for size in (16, 32, 128, 256, 512):
        icon.resize((size, size), Image.LANCZOS).save(
            os.path.join(iconset_dir, f"icon_{size}x{size}.png")
        )
        icon.resize((size * 2, size * 2), Image.LANCZOS).save(
            os.path.join(iconset_dir, f"icon_{size}x{size}@2x.png")
        )

    icon.save(os.path.join(os.path.dirname(iconset_dir), "icon.png"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
