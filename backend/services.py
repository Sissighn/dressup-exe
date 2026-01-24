import os
from io import BytesIO
from PIL import Image
import replicate
import requests
import base64

# WICHTIG: Absoluter Pfad verwenden!
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


async def apply_face_restoration(original_avatar_path, generated_outfit_path):
    """Setzt das Original-Gesicht wieder auf den generierten Körper."""
    try:
        output = replicate.run(
            "lucataco/faceswap:9a4298548422074c3f57258c5d544497314408314496c395973651431647436d",
            input={
                "target_image": open(generated_outfit_path, "rb"),
                "source_image": open(original_avatar_path, "rb"),
                "swap_mode": "inswapper",
            },
        )
        if output:
            response = requests.get(output)
            if response.status_code == 200:
                with open(generated_outfit_path, "wb") as f:
                    f.write(response.content)
                return True
        return False
    except Exception as e:
        print(f"⚠️ Face Restoration fehlgeschlagen: {e}")
        return False


async def try_gemini_generation(
    face_path, display_name, height, weight, body_type, gender
):
    try:
        from google import genai

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        face_image = Image.open(face_path)

        # Dein Original-Prompt
        prompt = (
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
            f"IMPORTANT: The person must be clearly {gender}. Maintain the exact facial identity from the image. "
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-image", contents=[prompt, face_image]
        )
        avatar_filename = os.path.join(
            UPLOAD_DIR, f"avatar_{display_name.replace(' ', '_')}_gemini.png"
        )

        # Bild speichern Logik
        image_saved = False
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "as_image") and part.as_image() is not None:
                    part.as_image().save(avatar_filename)
                    image_saved = True
                    break

        if image_saved:
            resize_to_target(avatar_filename, 1080, 1920)
            return {
                "success": True,
                "avatar_url": f"http://localhost:8000/uploads/{os.path.basename(avatar_filename)}",
            }
        return {"success": False, "error": "Keine Bilddaten"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def try_gemini_outfit_generation(avatar_path, top_path, bottom_path):
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        avatar_img = Image.open(avatar_path)
        top_img = Image.open(top_path)
        bottom_img = Image.open(bottom_path)

        # Dein Original-Prompt
        prompt = (
            "STRICT MANDATE: Generate ONLY a 9:16 portrait image (1080x1920). Maintain the full-body framing."
            "Do not follow the aspect ratio of the input images if they are square. "
            "Maintain the exact full-body framing of IMAGE 1 but replace clothes. "
            "The final image must be tall and vertical (portrait) from head to toes."
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

        # Vollständige Speicher-Logik
        image_saved = False
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "as_image") and part.as_image() is not None:
                    part.as_image().save(outfit_filename)
                    image_saved = True
                    break
                elif hasattr(part, "inline_data") and part.inline_data is not None:
                    image_data = base64.b64decode(part.inline_data.data)
                    with open(outfit_filename, "wb") as f:
                        f.write(image_data)
                    image_saved = True
                    break

        if not image_saved:
            return {"success": False, "error": "AI hat kein Bild generiert."}

        # Format fixieren
        resize_to_target(outfit_filename, 1080, 1920)

        # Gesicht wiederherstellen (Wichtig für Identität)
        await apply_face_restoration(avatar_path, outfit_filename)

        return {
            "success": True,
            "outfit_url": f"http://localhost:8000/uploads/{os.path.basename(outfit_filename)}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
