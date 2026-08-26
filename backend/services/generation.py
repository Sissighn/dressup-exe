"""Gemini-Aufrufe für Avatar- und Try-on-Generierung.

Der einzige Teil der Pipeline, der Netzwerk kostet. Jede Generierung wird gegen
zwei Kriterien validiert (Ganzkörper-Framing und genau eine Person) und bei
Bedarf über Korrektur-Passes nachgebessert.

UPLOAD_DIR kommt aus settings.py, damit Desktop-Builds den Ordner auf einen
beschreibbaren Pfad außerhalb des App-Bundles umbiegen können.
"""

import base64
import logging
import os

from PIL import Image, ImageOps

from settings import UPLOAD_DIR, build_upload_url

from .images import TARGET_HEIGHT, TARGET_WIDTH, create_avatar_reference, resize_to_target
from .prompts import (
    OUTFIT_MODE_COMBO,
    OUTFIT_MODE_DRESS,
    build_avatar_framing_correction_prompt,
    build_avatar_prompt,
    build_full_body_validation_prompt,
    build_outfit_fallback_prompt,
    build_outfit_framing_correction_prompt,
    build_outfit_identity_correction_prompt,
    build_outfit_try_on_prompt,
    build_single_subject_validation_prompt,
)

MAX_AVATAR_ATTEMPTS = 8
MAX_OUTFIT_FRAMING_ATTEMPTS = 3

IMAGE_MODEL = "gemini-2.5-flash-image"
VALIDATION_MODEL = "gemini-2.5-flash"

logger = logging.getLogger(__name__)


def save_generated_image(response, output_path):
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return False

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []

        for part in parts:
            if hasattr(part, "as_image") and part.as_image() is not None:
                part.as_image().save(output_path)
                return True
            if hasattr(part, "inline_data") and part.inline_data is not None:
                image_data = base64.b64decode(part.inline_data.data)
                with open(output_path, "wb") as f:
                    f.write(image_data)
                return True

    return False


def describe_generation_response(response):
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        text = getattr(response, "text", "") or ""
        return f"no candidates; text={text[:300]!r}"

    details = []
    for index, candidate in enumerate(candidates):
        finish_reason = getattr(candidate, "finish_reason", None)
        safety_ratings = getattr(candidate, "safety_ratings", None)
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        part_types = []

        for part in parts:
            if hasattr(part, "as_image") and part.as_image() is not None:
                part_types.append("image")
            elif hasattr(part, "inline_data") and part.inline_data is not None:
                part_types.append("inline_data")
            elif getattr(part, "text", None):
                part_types.append(f"text={part.text[:180]!r}")
            else:
                part_types.append(type(part).__name__)

        details.append(
            f"candidate[{index}] finish_reason={finish_reason!r} "
            f"parts={part_types!r} safety={safety_ratings!r}"
        )

    return " | ".join(details)


async def is_full_body_avatar(client, generated_image_path):
    try:
        with Image.open(generated_image_path) as generated_image:
            evaluation = client.models.generate_content(
                model=VALIDATION_MODEL,
                contents=[
                    build_full_body_validation_prompt(),
                    generated_image.copy(),
                ],
            )
        return (evaluation.text or "").strip().upper().startswith("PASS")
    except Exception:
        logger.warning("Full-body validation skipped", exc_info=True)
        return True


async def try_gemini_generation(
    face_path, display_name, height, weight, body_type, gender
):
    try:
        from google import genai

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        avatar_filename = os.path.join(
            UPLOAD_DIR, f"avatar_{display_name.replace(' ', '_')}_gemini.png"
        )
        face_scales = [0.34, 0.30, 0.26, 0.22, 0.18]
        last_error = "AI returned no image parts for avatar generation."

        with Image.open(face_path) as original_face:
            original_face_image = ImageOps.exif_transpose(original_face).convert("RGB")

        prompt = build_avatar_prompt(height, weight, body_type, gender)
        correction_prompt = build_avatar_framing_correction_prompt()

        for attempt in range(1, MAX_AVATAR_ATTEMPTS + 1):
            face_scale = face_scales[min(attempt - 1, len(face_scales) - 1)]
            reference_image = create_avatar_reference(face_path, face_scale=face_scale)

            response = client.models.generate_content(
                model=IMAGE_MODEL,
                contents=[prompt, reference_image, original_face_image],
            )

            image_saved = save_generated_image(response, avatar_filename)
            if not image_saved:
                last_error = "AI returned no image parts for avatar generation."
                continue

            resize_to_target(avatar_filename, TARGET_WIDTH, TARGET_HEIGHT)
            generated_avatar_url = build_upload_url(os.path.basename(avatar_filename))

            if await is_full_body_avatar(client, avatar_filename):
                return {
                    "success": True,
                    "avatar_url": generated_avatar_url,
                }

            logger.info(
                "Attempt %s: generated avatar was not full-body; retrying with wider composition",
                attempt,
            )

            with Image.open(avatar_filename) as generated_image_for_fix:
                fixed_response = client.models.generate_content(
                    model=IMAGE_MODEL,
                    contents=[
                        correction_prompt,
                        generated_image_for_fix.copy(),
                        original_face_image,
                    ],
                )

            fixed_saved = save_generated_image(fixed_response, avatar_filename)
            if fixed_saved:
                resize_to_target(avatar_filename, TARGET_WIDTH, TARGET_HEIGHT)
                if await is_full_body_avatar(client, avatar_filename):
                    return {
                        "success": True,
                        "avatar_url": generated_avatar_url,
                    }

            last_error = "AI generated an avatar, but strict full-body validation failed on all retry attempts."

        return {
            "success": False,
            "error": last_error,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def try_gemini_outfit_generation(
    avatar_path, top_path=None, bottom_path=None, dress_path=None
):
    """Generiert einen Try-on-Look.

    Entweder aus top_path + bottom_path (Kombination) oder aus dress_path
    (einteiliges Kleid). Die Garment-Bilder werden in derselben Reihenfolge an
    das Modell gereicht, in der die Prompts sie als IMAGE 2 / IMAGE 3 ansprechen.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        mode = OUTFIT_MODE_DRESS if dress_path else OUTFIT_MODE_COMBO
        garment_paths = (
            [dress_path] if mode == OUTFIT_MODE_DRESS else [top_path, bottom_path]
        )

        with Image.open(avatar_path) as avatar_source:
            avatar_img = ImageOps.exif_transpose(avatar_source).convert("RGB")

        garment_imgs = []
        for garment_path in garment_paths:
            with Image.open(garment_path) as garment_source:
                garment_imgs.append(
                    ImageOps.exif_transpose(garment_source).convert("RGBA")
                )

        outfit_filename = os.path.join(
            UPLOAD_DIR, f"outfit_result_{os.path.basename(avatar_path)}"
        )

        image_saved = False
        last_response_debug = "No generation response."
        for prompt_attempt, prompt in enumerate(
            [
                build_outfit_try_on_prompt(mode),
                build_outfit_fallback_prompt(mode),
            ],
            start=1,
        ):
            response = client.models.generate_content(
                model=IMAGE_MODEL,
                contents=[prompt, avatar_img, *garment_imgs],
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold="OFF",
                        )
                    ]
                ),
            )

            image_saved = save_generated_image(response, outfit_filename)
            if image_saved:
                break

            last_response_debug = describe_generation_response(response)
            logger.warning(
                "Gemini outfit generation returned no image on prompt attempt %s: %s",
                prompt_attempt,
                last_response_debug,
            )

        if not image_saved:
            return {
                "success": False,
                "error": (
                    "AI returned no image part for the outfit try-on. "
                    f"{last_response_debug}"
                ),
            }

        # Format bildfüllend fixieren (ohne Letterbox-Ränder).
        resize_to_target(outfit_filename, TARGET_WIDTH, TARGET_HEIGHT)

        # Validate single-subject output and apply one correction pass if needed
        try:
            with Image.open(outfit_filename) as generated_outfit:
                validation = client.models.generate_content(
                    model=VALIDATION_MODEL,
                    contents=[
                        build_single_subject_validation_prompt(),
                        generated_outfit.copy(),
                    ],
                )

            is_single_subject = (
                (validation.text or "").strip().upper().startswith("PASS")
            )

            if not is_single_subject:
                correction_prompt = build_outfit_identity_correction_prompt(mode)

                with Image.open(outfit_filename) as generated_outfit:
                    fixed_response = client.models.generate_content(
                        model=IMAGE_MODEL,
                        contents=[
                            correction_prompt,
                            generated_outfit.copy(),
                            avatar_img,
                            *garment_imgs,
                        ],
                    )

                fixed_saved = save_generated_image(fixed_response, outfit_filename)
                if fixed_saved:
                    resize_to_target(outfit_filename, TARGET_WIDTH, TARGET_HEIGHT)

            framing_correction_prompt = build_outfit_framing_correction_prompt(mode)
            for attempt in range(1, MAX_OUTFIT_FRAMING_ATTEMPTS + 1):
                if await is_full_body_avatar(client, outfit_filename):
                    break

                logger.info(
                    "Outfit framing attempt %s: feet/head not fully visible; reframing",
                    attempt,
                )
                with Image.open(outfit_filename) as generated_outfit:
                    reframed_response = client.models.generate_content(
                        model=IMAGE_MODEL,
                        contents=[
                            framing_correction_prompt,
                            generated_outfit.copy(),
                            avatar_img,
                            *garment_imgs,
                        ],
                    )

                reframed_saved = save_generated_image(
                    reframed_response, outfit_filename
                )
                if reframed_saved:
                    resize_to_target(outfit_filename, TARGET_WIDTH, TARGET_HEIGHT)
        except Exception:
            logger.warning("Single-subject validation skipped", exc_info=True)

        return {
            "success": True,
            "outfit_url": build_upload_url(os.path.basename(outfit_filename)),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
