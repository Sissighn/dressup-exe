import os
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import base64

try:
    from rembg import remove as rembg_remove

    rembg_import_error = None
except ImportError as exc:
    rembg_remove = None
    rembg_import_error = str(exc)

# WICHTIG: Absoluter Pfad verwenden!
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
MAX_AVATAR_ATTEMPTS = 8


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


def normalize_gender(gender):
    gender_value = (gender or "person").strip().lower()
    if gender_value in {"male", "man", "männlich"}:
        return "male"
    if gender_value in {"female", "woman", "weiblich"}:
        return "female"
    return "person"


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


def build_avatar_prompt(height, weight, body_type, gender, attempt):
    subject_gender = normalize_gender(gender)
    makeup_instruction = ""

    if subject_gender == "female":
        makeup_instruction = (
            " If the reference face shows makeup, reproduce the same makeup style, placement, colors, and intensity on the avatar face."
            " If the reference face has no makeup, keep the avatar face natural without adding new makeup."
        )

    return (
        f"STRICT FORMAT RULE: Generate a vertical 9:16 portrait image (1080x1920 pixels). "
        f"IMPORTANT: The ENTIRE body from HEAD to FEET must be VISIBLE in the 9:16 portrait format."
        f"The output MUST be a tall portrait, regardless of the input image shape. "
        f"\nCONTENT: A stunning, highly photorealistic full-body portrait of a {gender} with a {body_type} body type, featuring this exact face. "
        f"- Visible head to toe. "
        f"- Height: {height}cm, Weight: {weight}kg. "
        f"- Clothing: High-quality sport white TANK top and grey leggings. "
        f"- Pose: Standing upright, confident natural pose, facing camera. "
        f"- Lighting: Soft cinematic studio lighting to enhance facial features naturally. "
        f"- Background: Solid neutral grey studio background."
        f"IMPORTANT: The person must be clearly {gender}. Maintain the exact facial identity from the image."
        f" Preserve skin texture, eyebrows, eyes, nose, lips, and overall face proportions as closely as possible."
        f"{makeup_instruction}"
    )


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


async def is_full_body_avatar(client, generated_image_path):
    try:
        with Image.open(generated_image_path) as generated_image:
            evaluation = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    (
                        "Answer with PASS or FAIL only. PASS only if the image shows exactly one person in a full-body view: "
                        "the entire person is visible from head to both feet, with feet fully inside the frame and no crop below the ankles or above the head. "
                        "FAIL for any upper-body, half-body, knee-up, or partially cropped composition."
                    ),
                    generated_image.copy(),
                ],
            )
        return (evaluation.text or "").strip().upper().startswith("PASS")
    except Exception as e:
        print(f"⚠️ Full-body validation skipped: {e}")
        return True


def resize_to_target(image_path, target_width=1080, target_height=1920):
    """Skaliert Bild exakt auf 1080x1920 ohne Verzerrung."""
    try:
        if not os.path.exists(image_path):
            print(f"⚠️ Datei nicht gefunden für Resize: {image_path}")
            return

        with Image.open(image_path) as img:
            if img.size == (target_width, target_height):
                return

            print(f"📏 Anpassung auf exakt {target_width}x{target_height}...")
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
            print(f"✅ Finales Format fixiert.")
    except Exception as e:
        print(f"⚠️ Resize fehlgeschlagen: {e}")


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

        for attempt in range(1, MAX_AVATAR_ATTEMPTS + 1):
            face_scale = face_scales[min(attempt - 1, len(face_scales) - 1)]
            reference_image = create_avatar_reference(face_path, face_scale=face_scale)
            prompt = build_avatar_prompt(height, weight, body_type, gender, attempt)

            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt, reference_image, original_face_image],
            )

            image_saved = save_generated_image(response, avatar_filename)
            if not image_saved:
                last_error = "AI returned no image parts for avatar generation."
                continue

            resize_to_target(avatar_filename, TARGET_WIDTH, TARGET_HEIGHT)
            generated_avatar_url = (
                f"http://localhost:8000/uploads/{os.path.basename(avatar_filename)}"
            )

            if await is_full_body_avatar(client, avatar_filename):
                return {
                    "success": True,
                    "avatar_url": generated_avatar_url,
                }

            print(
                f"⚠️ Attempt {attempt}: Generated avatar was not full-body. Retrying with a wider composition."
            )

            correction_prompt = (
                "Image editing task. Keep the same person identity and outfit exactly, but change framing only. "
                "Generate an exact 1080x1920 vertical image where the full body is visible from head to both feet. "
                "Do not crop the feet, ankles, legs, hands, or head. "
                "Zoom the camera out and keep empty space above head and below feet. "
                "One person only, standing, front-facing, neutral grey studio background."
            )

            with Image.open(avatar_filename) as generated_image_for_fix:
                fixed_response = client.models.generate_content(
                    model="gemini-2.5-flash-image",
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


async def try_gemini_outfit_generation(avatar_path, top_path, bottom_path):
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        with Image.open(avatar_path) as avatar_source:
            avatar_img = ImageOps.exif_transpose(avatar_source).convert("RGB")
        with Image.open(top_path) as top_source:
            top_img = ImageOps.exif_transpose(top_source).convert("RGBA")
        with Image.open(bottom_path) as bottom_source:
            bottom_img = ImageOps.exif_transpose(bottom_source).convert("RGBA")

        # Enforce a single-subject try-on result (no split screen / no duplicate person)
        prompt = (
            "STRICT MANDATE: Generate ONLY ONE PERSON in a single 9:16 portrait image (1080x1920). "
            "Do NOT create split-screen, side-by-side, before/after, collage, mirror duplicate, or multiple people. "
            "Use IMAGE 1 as the identity and pose reference. Replace clothing with garments inspired by IMAGE 2 (top) and IMAGE 3 (bottom). "
            "CRITICAL FRAMING: keep the same camera distance as IMAGE 1 and do NOT zoom in. "
            "Keep full-body framing from head to toes, with both feet and top of head fully visible in frame. "
            "Leave some empty space above the head and below the feet. "
            "Fill the entire frame naturally (no white bars, no side borders, no letterboxing). "
            "Background must be clean and neutral. "
            "Output must be one single full-body avatar only."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, avatar_img, top_img, bottom_img],
            config=types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"
                    )
                ]
            ),
        )

        outfit_filename = os.path.join(
            UPLOAD_DIR, f"outfit_result_{os.path.basename(avatar_path)}"
        )

        image_saved = save_generated_image(response, outfit_filename)

        if not image_saved:
            return {"success": False, "error": "AI hat kein Bild generiert."}

        # Format fixieren bildfüllend (ohne Letterbox-Ränder)
        resize_to_target(outfit_filename, 1080, 1920)

        # Validate single-subject output and apply one correction pass if needed
        try:
            with Image.open(outfit_filename) as generated_outfit:
                validation = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        (
                            "Answer with PASS or FAIL only. PASS only if this image contains exactly one person (single subject), "
                            "not two people, no side-by-side comparison, no collage, and no split-screen layout."
                        ),
                        generated_outfit.copy(),
                    ],
                )

            is_single_subject = (
                (validation.text or "").strip().upper().startswith("PASS")
            )

            if not is_single_subject:
                correction_prompt = (
                    "Image editing task. Keep only ONE person in frame. "
                    "Remove any second person, duplicate, mirror, split-screen, or before/after layout. "
                    "Preserve the same main subject identity from IMAGE 1 and apply the outfit style from IMAGE 2 and IMAGE 3. "
                    "Return a single full-body 1080x1920 portrait from head to toes on a clean neutral background. "
                    "Do not zoom in. Keep space above head and below feet. "
                    "No white bars, no side borders, no letterboxing."
                )

                with Image.open(outfit_filename) as generated_outfit:
                    fixed_response = client.models.generate_content(
                        model="gemini-2.5-flash-image",
                        contents=[
                            correction_prompt,
                            generated_outfit.copy(),
                            avatar_img,
                            top_img,
                            bottom_img,
                        ],
                    )

                fixed_saved = save_generated_image(fixed_response, outfit_filename)
                if fixed_saved:
                    resize_to_target(outfit_filename, 1080, 1920)

            # Ensure full-body framing (head + feet visible). If not, run one framing correction pass.
            if not await is_full_body_avatar(client, outfit_filename):
                framing_correction_prompt = (
                    "Image editing task. Keep the same person identity and same outfit exactly. "
                    "Change framing only: zoom out so the entire body is visible from head to both feet. "
                    "Do not crop head, hands, legs, ankles, or feet. "
                    "Keep a 1080x1920 portrait with empty space above head and below feet, one person only, neutral background. "
                    "Fill frame edge-to-edge without white side borders or letterboxing."
                )

                with Image.open(outfit_filename) as generated_outfit:
                    reframed_response = client.models.generate_content(
                        model="gemini-2.5-flash-image",
                        contents=[
                            framing_correction_prompt,
                            generated_outfit.copy(),
                            avatar_img,
                            top_img,
                            bottom_img,
                        ],
                    )

                reframed_saved = save_generated_image(
                    reframed_response, outfit_filename
                )
                if reframed_saved:
                    resize_to_target(outfit_filename, 1080, 1920)
        except Exception as e:
            print(f"⚠️ Single-subject validation skipped: {e}")

        return {
            "success": True,
            "outfit_url": f"http://localhost:8000/uploads/{os.path.basename(outfit_filename)}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
