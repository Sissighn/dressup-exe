import os
from io import BytesIO
from PIL import Image

UPLOAD_DIR = "uploads"


async def try_gemini_generation(face_path, display_name, height, weight, body_type):
    """Versuch 1: Gemini Nano Banana (schnell & günstig)"""
    try:
        from google import genai
        from google.genai import types

        print("🔵 Versuch 1: Gemini Nano Banana...")

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        face_image = Image.open(face_path)
        img_byte_arr = BytesIO()
        face_image.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        prompt = (
            f"Create a realistic full-body avatar of a {body_type} person with this face. "
            f"The person should be approximately {height}cm tall and {weight}kg in weight. "
            f"The avatar should wear simple, neutral clothing: a white tank top and grey leggings. "
            f"The person should be standing upright in a natural pose, facing the camera. "
            f"Studio lighting, neutral grey background, high quality, photorealistic, 8k. "
            f"Maintain the exact facial features from the provided image. "
            f"Full body visible from head to toe."
            f"IMPORTANT: Show the entire body from head to shoes, feet must be visible. "  # Ganzkörper betont
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=img_byte_arr.getvalue(), mime_type="image/png"
                ),
            ],
        )

        # Debug: Response-Struktur prüfen
        print(f"📊 Response Type: {type(response)}")
        print(f"📊 Has candidates: {hasattr(response, 'candidates')}")

        # Bild speichern
        avatar_filename = (
            f"{UPLOAD_DIR}/avatar_{display_name.replace(' ', '_')}_gemini.png"
        )

        # Verschiedene Response-Strukturen versuchen
        image_data = None

        # Variante 1: Standard candidates structure
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, "content") and candidate.content:
                if hasattr(candidate.content, "parts") and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "inline_data") and part.inline_data:
                            image_data = part.inline_data.data
                            break

        # Variante 2: Direkter Zugriff auf parts
        if not image_data and hasattr(response, "parts"):
            for part in response.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    image_data = part.inline_data.data
                    break

        # Variante 3: Direktes inline_data
        if not image_data and hasattr(response, "inline_data"):
            image_data = response.inline_data.data

        if image_data:
            with open(avatar_filename, "wb") as f:
                f.write(image_data)

            avatar_url = f"http://localhost:8000/{avatar_filename}"
            print("✅ Gemini Erfolg!")

            return {"success": True, "provider": "gemini", "avatar_url": avatar_url}

        print("❌ Keine Bilddaten in Response gefunden")
        return {"success": False, "error": "Keine Bilddaten in Response"}

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Gemini fehlgeschlagen: {error_msg[:100]}...")

        # Check ob Quota-Problem
        if (
            "429" in error_msg
            or "quota" in error_msg.lower()
            or "RESOURCE_EXHAUSTED" in error_msg
        ):
            return {"success": False, "error": "quota_exceeded"}

        return {"success": False, "error": error_msg}


async def try_replicate_generation(face_path, display_name, height, weight, body_type):
    """Versuch 2: Replicate PhotoMaker (Fallback)"""
    try:
        import replicate

        print("🟠 Versuch 2: Replicate PhotoMaker (Fallback)...")

        prompt = (
            f"Create a realistic full-body avatar of a {body_type} person with this face. "
            f"The person should be approximately {height}cm tall and {weight}kg in weight. "
            f"The avatar should wear simple, neutral clothing: a white tank top and grey leggings. "
            f"The person should be standing upright in a natural pose, facing the camera. "
            f"Studio lighting, neutral grey background, high quality, photorealistic, 8k. "
            f"Maintain the exact facial features from the provided image. "
            f"Full body visible from head to toe."
            f"IMPORTANT: Show the entire body from head to shoes, feet must be visible. "  # Ganzkörper betont
        )

        output = replicate.run(
            "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
            input={
                "prompt": prompt,
                "num_steps": 30,
                "style_name": "Photographic (Default)",
                "input_image": open(face_path, "rb"),
                "num_outputs": 1,
                "guidance_scale": 5,
                "negative_prompt": "nsfw, ugly, distorted, low quality, extra fingers",
            },
        )

        avatar_url = output[0] if isinstance(output, list) else output
        print("✅ Replicate Erfolg!")

        return {"success": True, "provider": "replicate", "avatar_url": avatar_url}

    except Exception as e:
        print(f"❌ Replicate auch fehlgeschlagen: {str(e)}")
        return {"success": False, "error": str(e)}
