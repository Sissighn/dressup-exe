import logging
import os
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import base64
from settings import UPLOAD_DIR, build_upload_url

try:
    from rembg import remove as rembg_remove

    rembg_import_error = None
except ImportError as exc:
    rembg_remove = None
    rembg_import_error = str(exc)

# UPLOAD_DIR kommt aus settings.py, damit Desktop-Builds den Ordner
# auf einen beschreibbaren Pfad ausserhalb des App-Bundles umbiegen koennen.

TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
MAX_AVATAR_ATTEMPTS = 8
MAX_OUTFIT_FRAMING_ATTEMPTS = 3
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


# Basiskleidung des generierten Avatars. Einzige Quelle fuer Avatar- UND
# Try-on-Prompts: die Try-on-Prompts muessen exakt die Kleidung benennen, die
# sie entfernen sollen. Frueher standen beide Beschreibungen unabhaengig im
# Code und liefen auseinander (Avatar trug Shorts, Try-on entfernte Leggings).
BASE_AVATAR_TOP = "white fitted tank top"
BASE_AVATAR_BOTTOM = "close-fitting black studio shorts"

# Try-on-Modi: Oberteil + Hose/Rock kombinieren oder ein einteiliges Kleid.
OUTFIT_MODE_COMBO = "combo"
OUTFIT_MODE_DRESS = "dress"


def describe_base_avatar_outfit():
    return f"a {BASE_AVATAR_TOP} and {BASE_AVATAR_BOTTOM}"


def build_avatar_clothing_instruction(subject_gender):
    """Beschreibt den Basis-Look des Avatars.

    Die Shorts muessen explizit beschrieben werden: bei einer vagen Angabe wie
    "simple neutral studio shorts" generiert das Modell boxershorts-artige
    Unisex-Shorts in Hautton. Beine bleiben frei, damit die Try-on-Prompts
    Roecke und kurze Hosen ohne durchscheinende Basiskleidung rendern koennen.
    """
    # Artikel gehoert zur Variante, sonst entsteht "in a athletic ... cut".
    if subject_gender == "female":
        cut = "a high-waisted women's"
    elif subject_gender == "male":
        cut = "an athletic men's"
    else:
        cut = "a streamlined unisex"

    return (
        f"- Clothing: High-quality {BASE_AVATAR_TOP} and {BASE_AVATAR_BOTTOM} "
        f"in {cut} cut, ending at the upper thigh, with bare legs visible. "
        f"The shorts must read as deliberate studio wardrobe, never as loose boxer shorts or underwear, "
        f"and must clearly contrast with the skin tone. "
    )


def build_base_outfit_removal_clause(image_label="IMAGE 1"):
    """Anweisung, die Basiskleidung restlos zu ersetzen."""
    return (
        f"The person in {image_label} wears {describe_base_avatar_outfit()} as placeholder studio wardrobe. "
        f"This is NOT part of the look: remove it completely. It must never show through, "
        f"layer underneath, or extend beyond the selected garments. "
    )


def build_leg_coverage_clause(mode=OUTFIT_MODE_COMBO):
    """Verhindert erfundene Unterschichten unter beinfreier Kleidung.

    Bewusst farbneutral formuliert: die Regel gilt fuer jede erfundene
    Unterschicht, nicht nur fuer die grauen Leggings einer frueheren
    Avatar-Version.
    """
    if mode == OUTFIT_MODE_DRESS:
        return (
            "If the dress hem exposes the legs, render natural bare legs below the hem, unless the dress reference "
            "itself clearly shows attached tights, leggings, or stockings. "
            "Never invent leggings, tights, stockings, base shorts, trousers, or any underlayer that is not visible "
            "in the dress reference. "
        )

    return (
        "If the bottom reference exposes the legs (skirt, mini skirt, shorts, culottes), render natural bare legs "
        "below the hem, unless the bottom reference itself clearly shows tights, leggings, stockings, or trousers. "
        "Never invent leggings, tights, stockings, base shorts, or any underlayer that is not visible in the bottom reference. "
    )


def build_garment_reference_clause(mode):
    """Benennt, welche Referenzbilder welches Kleidungsstueck liefern."""
    if mode == OUTFIT_MODE_DRESS:
        return (
            "Use IMAGE 2 as the only garment reference. It is a ONE-PIECE DRESS and must be worn as the complete outfit: "
            "no separate top, no shirt, no trousers, and no skirt layered under or over it. "
            "Recreate its visible silhouette, color, pattern, texture, neckline, sleeve length, waistline, hem length, and fit. "
        )

    return (
        "Use IMAGE 2 as the only top reference and IMAGE 3 as the only bottom reference. "
        "Recreate their visible garment category, silhouette, color, texture, length, and fit. "
    )


def build_garment_length_clause(mode):
    """Sorgt dafuer, dass lange Schnitte samt Saum korrekt dargestellt werden."""
    if mode == OUTFIT_MODE_DRESS:
        return (
            "If the dress is a maxi, midi, or floor-length design, render the full hem and the resulting "
            "legs/feet composition faithfully instead of shortening it. "
        )

    return (
        "If IMAGE 3 is a long skirt, maxi skirt, dress-like bottom, trousers, jeans, or leggings, render that garment "
        "faithfully and show the full hem/legs/feet composition according to the garment. "
    )


# Ein einzelnes Adjektiv wie "CURVY" steuert Bildmodelle kaum - sie fallen auf
# ihren Standard-Modelkoerper zurueck (gerade, rechteckige Silhouette). Deshalb
# wird jeder Koerpertyp ueber konkrete Schulter-Taille-Huefte-Verhaeltnisse
# beschrieben, die das Modell tatsaechlich umsetzen kann.
BODY_TYPE_PROFILES = {
    "slim": {
        "silhouette": (
            "narrow shoulders, a narrow ribcage, and narrow hips of nearly the same width, "
            "slender arms and legs, visible collarbones, and a long lean vertical line with "
            "only subtle waist definition"
        ),
        "female": "a small bust and a flat stomach",
        "male": "a lean flat chest and a slim waist",
    },
    "athletic": {
        # Eine breite, kantige V-Taper-Schulterpartie ist eine maennliche
        # Morphologie. Fuer weibliche Avatare wird "athletic" deshalb ueber
        # Definition und Straffheit beschrieben, nicht ueber Schulterbreite.
        "silhouette": (
            "toned, athletic proportions with visible muscle definition in the arms and legs, "
            "a firm flat midsection, and a clearly defined waist"
        ),
        "silhouette_female": (
            "an athletic yet distinctly feminine build: softly sculpted shoulders that stay in "
            "balance with the hips and are never broader or squared-off, lean visible muscle tone "
            "in the arms and legs, a firm flat midsection with a clearly defined narrow waist, and "
            "gently curved, toned hips, glutes, and thighs - the figure of a female dancer or "
            "fitness model, not of a male athlete"
        ),
        "silhouette_male": (
            "broad, squared-off shoulders that are clearly wider than the hips, visible muscle "
            "definition in the shoulders, arms, and thighs, a firm flat midsection, and a "
            "distinct V-taper from shoulders down to a narrow waist"
        ),
        "female": (
            "a natural feminine bust, a soft feminine jawline and neck, and strong but slender "
            "thighs and calves. Keep the muscles lean and elegant, never bulky. Absolutely avoid a "
            "masculine silhouette: no broad squared shoulder line, no V-taper physique, no "
            "bodybuilder mass, no flat boxy hips"
        ),
        "male": "a broad muscular chest and defined abdominals",
    },
    "curvy": {
        "silhouette": (
            "wide, rounded hips that clearly match or exceed the shoulder width, a noticeably "
            "narrow and sharply indented waist, and full soft thighs - an unmistakable hourglass "
            "line where the waist is dramatically narrower than both bust and hips"
        ),
        "female": "a full rounded bust",
        "male": "a solid, rounded chest and a fuller midsection",
    },
    "rectangular": {
        "silhouette": (
            "shoulders, waist, and hips of almost identical width, very little waist indentation, "
            "and a straight up-and-down column silhouette with a flat stomach and straight hip line"
        ),
        "female": "a modest bust and an undefined waistline",
        "male": "an even, straight torso without taper",
    },
}


def normalize_body_type(body_type):
    value = (body_type or "").strip().lower()
    aliases = {
        "hourglass": "curvy",
        "kurvig": "curvy",
        "sportlich": "athletic",
        "muscular": "athletic",
        "schlank": "slim",
        "slender": "slim",
        "rechteckig": "rectangular",
        "straight": "rectangular",
    }
    value = aliases.get(value, value)
    return value if value in BODY_TYPE_PROFILES else ""


def build_body_type_instruction(body_type, subject_gender):
    """Uebersetzt den ausgewaehlten Koerpertyp in konkrete Proportionen."""
    normalized = normalize_body_type(body_type)
    if not normalized:
        # Unbekannter Wert: lieber die Rohangabe durchreichen als sie zu verlieren.
        raw = (body_type or "average").strip().lower()
        return f"- Body shape: a {raw} body type. "

    profile = BODY_TYPE_PROFILES[normalized]
    # Manche Koerpertypen brauchen eine eigene Silhouette pro Geschlecht -
    # "athletic" beschreibt bei Frauen und Maennern unterschiedliche Formen.
    silhouette = profile.get(f"silhouette_{subject_gender}", profile["silhouette"])
    detail = profile.get(subject_gender, "")
    detail_clause = f" The figure also has {detail}. " if detail else " "

    femininity_guard = (
        "The overall silhouette must read as unmistakably female. "
        if subject_gender == "female"
        else ""
    )

    return (
        f"- Body shape ({normalized.upper()}) - this is a defining requirement, not a suggestion: "
        f"the figure has {silhouette}.{detail_clause}{femininity_guard}"
        f"The {normalized.upper()} silhouette must be immediately recognizable in the final image and "
        f"clearly distinguishable from the other body types. Do not default to a generic straight "
        f"fashion-model physique. "
    )


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
        f"\nCONTENT: A stunning, highly photorealistic full-body portrait of a {gender}, featuring this exact face. "
        f"- Visible head to toe. "
        f"- Height: {height}cm, Weight: {weight}kg. "
        f"{build_body_type_instruction(body_type, subject_gender)}"
        f"If the height and weight numbers seem to conflict with the described body shape, "
        f"prioritize the body shape and keep the proportions above. "
        f"{build_avatar_clothing_instruction(subject_gender)}"
        f"- Pose: Standing upright, confident natural pose, facing camera. "
        f"- Facial expression: quietly self-assured with a subtle closed-lip smile - the corners of the mouth "
        f"lifted just slightly, cheeks softly engaged, eyes looking directly into the camera with a calm, "
        f"confident gaze. Not a blank neutral stare, not a wide open-mouth grin, not a smirk. "
        f"- Lighting: Soft cinematic studio lighting to enhance facial features naturally. "
        f"- Background: Solid neutral grey studio background."
        f"IMPORTANT: The person must be clearly {gender}. Maintain the exact facial identity from the image."
        f" Preserve skin texture, eyebrows, eyes, nose, lip shape, and overall face proportions as closely as possible."
        f" The expression may differ from the reference photo - adjust only the mouth and eyes to achieve the "
        f"confident subtle smile, while every identity-defining feature stays unchanged."
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
    except Exception:
        logger.warning("Full-body validation skipped", exc_info=True)
        return True


def resize_to_target(image_path, target_width=1080, target_height=1920):
    """Skaliert Bild exakt auf 1080x1920 ohne Verzerrung."""
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

            correction_prompt = (
                "Image editing task. Keep the same person identity and outfit exactly, but change framing only. "
                "Preserve the existing body proportions, silhouette, and facial expression unchanged - "
                "do not slim, reshape, or normalize the figure while reframing. "
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


def build_outfit_try_on_prompt(mode=OUTFIT_MODE_COMBO):
    return (
        "FASHION TRY-ON TASK: Create a premium photorealistic fashion catalog render in a vertical 9:16 frame, exactly 1080x1920. "
        "Output ONE PERSON ONLY. No split-screen, no before/after, no collage, no duplicate body, no mirror copy. "
        "Use IMAGE 1 only for the person's identity, face, hair, body proportions, stance, and camera-facing pose. "
        "Do NOT preserve, copy, or continue any clothing or footwear from IMAGE 1. "
        f"{build_base_outfit_removal_clause()}"
        f"{build_garment_reference_clause(mode)}"
        f"{build_leg_coverage_clause(mode)}"
        f"{build_garment_length_clause(mode)}"
        "STRICT FRAMING: full body must be visible from the top of the head to the bottom of both feet, including shoes/feet fully inside the image. "
        "Do not crop feet, ankles, shoes, legs, hands, hair, or head. Leave clear empty studio space above the head and below the feet. "
        "Keep the camera zoomed out like a full-length fashion e-commerce photo, not a knee-up portrait. "
        "Use a clean neutral grey studio background, natural studio lighting, sharp focus, realistic anatomy, and high-quality fabric detail. "
        "Fill the image naturally without white bars, side borders, frames, or letterboxing."
    )


def build_outfit_fallback_prompt(mode=OUTFIT_MODE_COMBO):
    if mode == OUTFIT_MODE_DRESS:
        dressing_instruction = (
            "Dress the person in the one-piece dress from the second image, worn as the complete outfit. "
        )
    else:
        dressing_instruction = (
            "Dress the person in the top from the second image and the bottom garment from the third image. "
        )

    return (
        "Create a photorealistic full-body fashion try-on portrait, vertical 9:16, one person only. "
        "Use the first image for the person's face, hair, body proportions, and standing pose. "
        f"{dressing_instruction}"
        f"{build_base_outfit_removal_clause('the first image')}"
        f"{build_leg_coverage_clause(mode)}"
        "Show the complete body from head to both feet, including shoes/feet fully visible, on a neutral grey studio background."
    )


def build_outfit_identity_correction_prompt(mode=OUTFIT_MODE_COMBO):
    reference_images = (
        "IMAGE 2 as the only clothing reference"
        if mode == OUTFIT_MODE_DRESS
        else "IMAGE 2 and IMAGE 3 as the only clothing references"
    )

    return (
        "Image editing task. Keep only ONE person in frame and remove any duplicate, split-screen, mirror, collage, or before/after layout. "
        "Preserve the main subject identity, face, hair, body proportions, and pose from IMAGE 1. "
        f"Use {reference_images}. Do not preserve any clothing from IMAGE 1. "
        f"{build_base_outfit_removal_clause()}"
        f"{build_leg_coverage_clause(mode)}"
        "Return a premium single-person full-body 1080x1920 fashion catalog portrait on a clean neutral grey background. "
        "Head, hair, hands, legs, ankles, shoes, and both feet must be fully visible."
    )


def build_outfit_framing_correction_prompt(mode=OUTFIT_MODE_COMBO):
    reference_image = (
        "dress reference image" if mode == OUTFIT_MODE_DRESS else "bottom reference image"
    )

    return (
        "Image editing task. Change framing only and keep the same person identity and selected outfit. "
        "Zoom out to a full-length fashion catalog portrait so the entire body is visible from top of head to bottom of both feet. "
        "Both shoes/feet must be completely inside the frame with visible floor space below them. "
        "Do not crop head, hair, hands, legs, ankles, shoes, or feet. "
        "Do not add borders, white bars, side margins, or letterboxing. Keep a clean neutral grey studio background. "
        "Do not reintroduce the base avatar's placeholder wardrobe, leggings, tights, or underlayers "
        f"unless they are clearly present in the {reference_image}."
    )


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
                model="gemini-2.5-flash-image",
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
                    "AI hat kein Bild generiert. Gemini returned no image part. "
                    f"{last_response_debug}"
                ),
            }

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
                correction_prompt = build_outfit_identity_correction_prompt(mode)

                with Image.open(outfit_filename) as generated_outfit:
                    fixed_response = client.models.generate_content(
                        model="gemini-2.5-flash-image",
                        contents=[
                            correction_prompt,
                            generated_outfit.copy(),
                            avatar_img,
                            *garment_imgs,
                        ],
                    )

                fixed_saved = save_generated_image(fixed_response, outfit_filename)
                if fixed_saved:
                    resize_to_target(outfit_filename, 1080, 1920)

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
                        model="gemini-2.5-flash-image",
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
                    resize_to_target(outfit_filename, 1080, 1920)
        except Exception:
            logger.warning("Single-subject validation skipped", exc_info=True)

        return {
            "success": True,
            "outfit_url": build_upload_url(os.path.basename(outfit_filename)),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
