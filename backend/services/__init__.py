"""AI-Pipeline für Avatar- und Outfit-Generierung.

Aufgeteilt in drei Schichten, damit jede Sorge für sich testbar bleibt:

* :mod:`services.images`     - lokale Pillow/rembg-Verarbeitung, kein Netzwerk
* :mod:`services.prompts`    - reine Text-Builder für die Gemini-Prompts
* :mod:`services.generation` - die Gemini-Aufrufe samt Retry- und Korrektur-Logik

Router und Tests greifen über das Paket zu (``import services`` und dann
``services.try_gemini_generation(...)``), damit ``monkeypatch.setattr`` in den
Tests weiterhin an einer einzigen Stelle greift.
"""

from .generation import (
    IMAGE_MODEL,
    MAX_AVATAR_ATTEMPTS,
    MAX_OUTFIT_FRAMING_ATTEMPTS,
    VALIDATION_MODEL,
    describe_generation_response,
    is_full_body_avatar,
    save_generated_image,
    try_gemini_generation,
    try_gemini_outfit_generation,
)
from .images import (
    TARGET_HEIGHT,
    TARGET_WIDTH,
    create_avatar_reference,
    remove_background_from_image,
    resize_to_target,
)
from .prompts import (
    BASE_AVATAR_BOTTOM,
    BASE_AVATAR_TOP,
    BODY_TYPE_PROFILES,
    OUTFIT_MODE_COMBO,
    OUTFIT_MODE_DRESS,
    build_avatar_clothing_instruction,
    build_avatar_framing_correction_prompt,
    build_avatar_prompt,
    build_base_outfit_removal_clause,
    build_body_type_instruction,
    build_full_body_validation_prompt,
    build_garment_length_clause,
    build_garment_reference_clause,
    build_leg_coverage_clause,
    build_outfit_fallback_prompt,
    build_outfit_framing_correction_prompt,
    build_outfit_identity_correction_prompt,
    build_outfit_try_on_prompt,
    build_single_subject_validation_prompt,
    describe_base_avatar_outfit,
    normalize_body_type,
    normalize_gender,
)

__all__ = [
    "BASE_AVATAR_BOTTOM",
    "BASE_AVATAR_TOP",
    "BODY_TYPE_PROFILES",
    "IMAGE_MODEL",
    "MAX_AVATAR_ATTEMPTS",
    "MAX_OUTFIT_FRAMING_ATTEMPTS",
    "OUTFIT_MODE_COMBO",
    "OUTFIT_MODE_DRESS",
    "TARGET_HEIGHT",
    "TARGET_WIDTH",
    "VALIDATION_MODEL",
    "build_avatar_clothing_instruction",
    "build_avatar_framing_correction_prompt",
    "build_avatar_prompt",
    "build_base_outfit_removal_clause",
    "build_body_type_instruction",
    "build_full_body_validation_prompt",
    "build_garment_length_clause",
    "build_garment_reference_clause",
    "build_leg_coverage_clause",
    "build_outfit_fallback_prompt",
    "build_outfit_framing_correction_prompt",
    "build_outfit_identity_correction_prompt",
    "build_outfit_try_on_prompt",
    "build_single_subject_validation_prompt",
    "create_avatar_reference",
    "describe_base_avatar_outfit",
    "describe_generation_response",
    "is_full_body_avatar",
    "normalize_body_type",
    "normalize_gender",
    "remove_background_from_image",
    "resize_to_target",
    "save_generated_image",
    "try_gemini_generation",
    "try_gemini_outfit_generation",
]
