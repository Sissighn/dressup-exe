"""Prompt-Bausteine für Avatar- und Try-on-Generierung.

Reine Textfunktionen ohne I/O und ohne Gemini-Aufruf. Bildgenerierung kostet
pro Aufruf, deshalb wird das Verhalten der Pipeline hier auf Prompt-Ebene
getestet statt über echte Generierungen.
"""

# Basiskleidung des generierten Avatars. Einzige Quelle für Avatar- UND
# Try-on-Prompts: die Try-on-Prompts müssen exakt die Kleidung benennen, die
# sie entfernen sollen. Früher standen beide Beschreibungen unabhängig im
# Code und liefen auseinander (Avatar trug Shorts, Try-on entfernte Leggings).
BASE_AVATAR_TOP = "white fitted tank top"
BASE_AVATAR_BOTTOM = "close-fitting black studio shorts"

# Try-on-Modi: Oberteil + Hose/Rock kombinieren oder ein einteiliges Kleid.
OUTFIT_MODE_COMBO = "combo"
OUTFIT_MODE_DRESS = "dress"


def normalize_gender(gender):
    gender_value = (gender or "person").strip().lower()
    if gender_value in {"male", "man", "männlich"}:
        return "male"
    if gender_value in {"female", "woman", "weiblich"}:
        return "female"
    return "person"


def describe_base_avatar_outfit():
    return f"a {BASE_AVATAR_TOP} and {BASE_AVATAR_BOTTOM}"


def build_avatar_clothing_instruction(subject_gender):
    """Beschreibt den Basis-Look des Avatars.

    Die Shorts müssen explizit beschrieben werden: bei einer vagen Angabe wie
    "simple neutral studio shorts" generiert das Modell boxershorts-artige
    Unisex-Shorts in Hautton. Beine bleiben frei, damit die Try-on-Prompts
    Röcke und kurze Hosen ohne durchscheinende Basiskleidung rendern können.
    """
    # Artikel gehört zur Variante, sonst entsteht "in a athletic ... cut".
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

    Bewusst farbneutral formuliert: die Regel gilt für jede erfundene
    Unterschicht, nicht nur für die grauen Leggings einer früheren
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
    """Benennt, welche Referenzbilder welches Kleidungsstück liefern."""
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
    """Sorgt dafür, dass lange Schnitte samt Saum korrekt dargestellt werden."""
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
# ihren Standard-Modelkörper zurück (gerade, rechteckige Silhouette). Deshalb
# wird jeder Körpertyp über konkrete Schulter-Taille-Hüfte-Verhältnisse
# beschrieben, die das Modell tatsächlich umsetzen kann.
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
        # Eine breite, kantige V-Taper-Schulterpartie ist eine männliche
        # Morphologie. Für weibliche Avatare wird "athletic" deshalb über
        # Definition und Straffheit beschrieben, nicht über Schulterbreite.
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
    """Übersetzt den ausgewählten Körpertyp in konkrete Proportionen."""
    normalized = normalize_body_type(body_type)
    if not normalized:
        # Unbekannter Wert: lieber die Rohangabe durchreichen als sie zu verlieren.
        raw = (body_type or "average").strip().lower()
        return f"- Body shape: a {raw} body type. "

    profile = BODY_TYPE_PROFILES[normalized]
    # Manche Körpertypen brauchen eine eigene Silhouette pro Geschlecht -
    # "athletic" beschreibt bei Frauen und Männern unterschiedliche Formen.
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


def build_avatar_prompt(height, weight, body_type, gender):
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


def build_avatar_framing_correction_prompt():
    """Reframing-Pass, wenn der generierte Avatar nicht ganzkörperlich ist."""
    return (
        "Image editing task. Keep the same person identity and outfit exactly, but change framing only. "
        "Preserve the existing body proportions, silhouette, and facial expression unchanged - "
        "do not slim, reshape, or normalize the figure while reframing. "
        "Generate an exact 1080x1920 vertical image where the full body is visible from head to both feet. "
        "Do not crop the feet, ankles, legs, hands, or head. "
        "Zoom the camera out and keep empty space above head and below feet. "
        "One person only, standing, front-facing, neutral grey studio background."
    )


def build_full_body_validation_prompt():
    """Prüft, ob ein Render wirklich Kopf bis Fuß zeigt."""
    return (
        "Answer with PASS or FAIL only. PASS only if the image shows exactly one person in a full-body view: "
        "the entire person is visible from head to both feet, with feet fully inside the frame and no crop below the ankles or above the head. "
        "FAIL for any upper-body, half-body, knee-up, or partially cropped composition."
    )


def build_single_subject_validation_prompt():
    """Prüft, ob ein Render genau eine Person ohne Collage-Layout zeigt."""
    return (
        "Answer with PASS or FAIL only. PASS only if this image contains exactly one person (single subject), "
        "not two people, no side-by-side comparison, no collage, and no split-screen layout."
    )


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
