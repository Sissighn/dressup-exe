"""Local image processing for uploads and generated renders.

Everything in this module runs offline on Pillow/rembg - no Gemini calls, no
network. That keeps it cheap to test and safe to reuse from any router.
"""

import logging
import os
from io import BytesIO

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    from rembg import remove as rembg_remove

    rembg_import_error = None
except ImportError as exc:
    rembg_remove = None
    rembg_import_error = str(exc)

# Alle generierten Bilder werden auf dieses Portraitformat normalisiert.
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920

logger = logging.getLogger(__name__)


def remove_background_from_image(image_path):
    """Removes the background from an uploaded clothing image and saves it as PNG.

    Returns the final processed file path.
    """
    if rembg_remove is None:
        raise RuntimeError(
            f"Background removal dependency is not installed. {rembg_import_error}"
        )

    with Image.open(image_path) as source_image:
        normalized = ImageOps.exif_transpose(source_image).convert("RGBA")
        input_buffer = BytesIO()
        normalized.save(input_buffer, format="PNG")

    output_bytes = rembg_remove(input_buffer.getvalue())
    output_image = Image.open(BytesIO(output_bytes)).convert("RGBA")

    # IMPORTANT:
    # Do NOT crop to the non-transparent bounding box here.
    # Cropping makes garments fill most of the reference image and can
    # unintentionally push the try-on model to generate over-zoomed results.
    # Keeping the original canvas preserves garment scale/proportions.

    final_path = f"{os.path.splitext(image_path)[0]}.png"
    output_image.save(final_path)

    if final_path != image_path and os.path.exists(image_path):
        os.remove(image_path)

    return final_path


def create_avatar_reference(face_path, face_scale=0.32):
    """Platziert das hochgeladene Gesichtsbild klein auf einer 9:16 Leinwand,
    damit das Modell genügend Raum für einen Ganzkörper-Avatar erhält.
    """
    with Image.open(face_path) as original:
        source = ImageOps.exif_transpose(original).convert("RGB")

        background = ImageOps.fit(
            source,
            (TARGET_WIDTH, TARGET_HEIGHT),
            method=Image.Resampling.LANCZOS,
        )
        background = background.filter(ImageFilter.GaussianBlur(radius=32))
        background = ImageEnhance.Brightness(background).enhance(0.82)

        canvas = Image.new("RGB", (TARGET_WIDTH, TARGET_HEIGHT), (232, 232, 232))
        canvas.paste(background, (0, 0))

        subject = ImageOps.contain(
            source,
            (
                max(220, int(TARGET_WIDTH * face_scale)),
                max(320, int(TARGET_HEIGHT * 0.24)),
            ),
            method=Image.Resampling.LANCZOS,
        )

        panel_width = min(TARGET_WIDTH - 120, subject.width + 80)
        panel_height = min(TARGET_HEIGHT // 3, subject.height + 80)
        panel = Image.new("RGB", (panel_width, panel_height), (245, 245, 245))

        subject_x = (panel_width - subject.width) // 2
        subject_y = max(24, (panel_height - subject.height) // 2)
        panel.paste(subject, (subject_x, subject_y))

        panel_x = (TARGET_WIDTH - panel_width) // 2
        panel_y = 110
        canvas.paste(panel, (panel_x, panel_y))

        return canvas


def resize_to_target(image_path, target_width=TARGET_WIDTH, target_height=TARGET_HEIGHT):
    """Skaliert das Bild exakt auf das Zielformat, ohne zu verzerren."""
    try:
        if not os.path.exists(image_path):
            logger.warning("Image not found for resize: %s", image_path)
            return

        with Image.open(image_path) as img:
            if img.size == (target_width, target_height):
                return

            logger.info("Resizing image to %sx%s", target_width, target_height)
            target_ratio = target_width / target_height
            img_ratio = img.width / img.height

            if img_ratio > target_ratio:
                new_width = int(target_height * img_ratio)
                img = img.resize((new_width, target_height), Image.Resampling.LANCZOS)
                left = (new_width - target_width) / 2
                img = img.crop((left, 0, left + target_width, target_height))
            else:
                new_height = int(target_width / img_ratio)
                img = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
                top = (new_height - target_height) / 2
                img = img.crop((0, top, target_width, top + target_height))

            img.save(image_path)
            logger.info("Image format normalized")
    except Exception:
        logger.warning("Resize failed", exc_info=True)
