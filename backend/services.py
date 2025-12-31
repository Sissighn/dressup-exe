import os
from io import BytesIO
from PIL import Image
import replicate
import requests
import base64

UPLOAD_DIR = "uploads"


def crop_to_match_aspect_ratio(image_to_crop_path, reference_image_path):
    """
    Schneidet ein Bild so zu, dass es dem Seitenverhältnis eines Referenzbildes entspricht.
    Der Zuschnitt erfolgt von der Mitte aus, um das Hauptmotiv zu erhalten.
    """
    try:
        with Image.open(reference_image_path) as ref_img:
            target_aspect = ref_img.width / ref_img.height

        with Image.open(image_to_crop_path) as img:
            img_aspect = img.width / img.height

            if abs(img_aspect - target_aspect) < 0.01:
                print(
                    "📐 Seitenverhältnis stimmt bereits überein. Kein Zuschnitt nötig."
                )
                return

            print(
                f"📐 Passe Seitenverhältnis an. Ziel: {target_aspect:.2f}, Aktuell: {img_aspect:.2f}"
            )

            if img_aspect > target_aspect:
                # Bild ist breiter als das Ziel -> Breite zuschneiden
                new_width = int(target_aspect * img.height)
                offset = (img.width - new_width) / 2
                crop_box = (offset, 0, img.width - offset, img.height)
            else:
                # Bild ist höher als das Ziel -> Höhe zuschneiden
                new_height = int(img.width / target_aspect)
                offset = (img.height - new_height) / 2
                crop_box = (0, offset, img.width, img.height - offset)

            cropped_img = img.crop(crop_box)
            cropped_img.save(image_to_crop_path)
            print(
                f"✅ Bild erfolgreich auf {cropped_img.width}x{cropped_img.height} zugeschnitten."
            )

    except Exception as e:
        print(f"⚠️ Warnung: Zuschneiden des Bildes fehlgeschlagen: {e}")


async def apply_face_restoration(original_avatar_path, generated_outfit_path):
    """
    Post-Processing: Setzt das Original-Gesicht wieder auf den generierten Körper.
    Nutzt ein spezialisiertes Replicate-Modell (InsightFace) für maximale Identitätstreue.
    """
    print("🧑‍🔧 Starte Gesichts-Wiederherstellung (Face Restoration)...")
    try:

        output = replicate.run(
            "lucataco/faceswap:9a4298548422074c3f57258c5d544497314408314496c395973651431647436d",
            input={
                "target_image": open(generated_outfit_path, "rb"),
                "source_image": open(original_avatar_path, "rb"),
                "swap_mode": "inswapper",  # Der beste Algorithmus für Identität
            },
        )

        if output:
            response = requests.get(output)
            if response.status_code == 200:
                with open(generated_outfit_path, "wb") as f:
                    f.write(response.content)
                print("✅ Gesicht erfolgreich wiederhergestellt und Bild aktualisiert!")
                return True
            else:
                print("⚠️ Fehler beim Herunterladen des restaurierten Bildes.")

        return False

    except Exception as e:
        print(
            f"⚠️ Warnung: Gesichts-Wiederherstellung fehlgeschlagen. (Der Prozess läuft trotzdem weiter). Fehler: {str(e)}"
        )
        return False


async def try_gemini_generation(face_path, display_name, height, weight, body_type):
    """Versuch 1: Gemini Nano Banana (schnell & günstig)"""
    try:
        from google import genai

        print("🔵 Versuch 1: Gemini Nano Banana...")

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        face_image = Image.open(face_path)

        prompt = (
            f"Create a realistic full-body avatar of a {body_type} person with this face. "
            f"The person should be approximately {height}cm tall and {weight}kg in weight. "
            f"The avatar should wear simple, neutral clothing: a white tank top and grey leggings. "
            f"The person should be standing upright in a natural pose, facing the camera. "
            f"Studio lighting, neutral grey background, high quality, photorealistic, 8k. "
            f"Maintain the exact facial features from the provided image. "
            f"Full body visible from head to toe."
            f"IMPORTANT: Show the entire body from head to shoes, feet must be visible. "
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, face_image],
        )

        avatar_filename = (
            f"{UPLOAD_DIR}/avatar_{display_name.replace(' ', '_')}_gemini.png"
        )

        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                image.save(avatar_filename)

                avatar_url = f"http://localhost:8000/{avatar_filename}"
                print("✅ Gemini Erfolg!")

                return {"success": True, "provider": "gemini", "avatar_url": avatar_url}

        return {"success": False, "error": "Keine Bilddaten in Response"}

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Gemini fehlgeschlagen: {error_msg[:100]}...")

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
            f"IMPORTANT: Show the entire body from head to shoes, feet must be visible. "
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


async def try_gemini_outfit_generation(avatar_path, top_path, bottom_path):
    """
    2-Stufen-Prozess:
    1. Gemini generiert das Outfit auf dem Körper (Fokus auf Kleidung & Pose).
    2. Replicate restauriert das originale Gesicht (Fokus auf Identität).
    """
    try:
        from google import genai
        from google.genai import types

        print("\n🚀 Starte 2-Stufen Outfit-Pipeline...")

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        # Bilder laden
        avatar_img = Image.open(avatar_path)
        original_width, original_height = avatar_img.size
        top_img = Image.open(top_path)
        bottom_img = Image.open(bottom_path)

        prompt = (
            "COMMAND: Perform a precise clothing substitution. "
            "IMAGE 1 is the master reference for the person's body, pose, and the final image framing. "
            "IMAGE 2 is the top to wear. IMAGE 3 is the bottom to wear. "
            "\n\nRULES: "
            "1. FINAL IMAGE COMPOSITION: The output MUST perfectly match the framing, zoom, and canvas composition of IMAGE 1. The final image dimensions should be portrait-style, approximately "
            f"{original_width}x{original_height} pixels. Do not generate a square or landscape image. "
            "2. BODY & POSE: The person's body shape, size, and standing pose must be identical to IMAGE 1. "
            "3. CLOTHING: Replace the original clothing with the exact items from IMAGE 2 (top) and IMAGE 3 (bottom). "
            "4. FACE: The face should remain consistent with IMAGE 1. A post-processing step will restore it perfectly, so focus on the body and clothes. "
            "5. BACKGROUND: Maintain the same neutral grey studio background and lighting from IMAGE 1. "
            "Output only the single final result."
        )

        print(
            "⚡ Stufe 1: Gemini generiert Outfit & Pose (Modell: gemini-2.5-flash-image)..."
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, avatar_img, top_img, bottom_img],
            config=types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT", threshold="OFF"
                    ),
                ]
            ),
        )

        outfit_filename = f"{UPLOAD_DIR}/outfit_result_{os.path.basename(avatar_path)}"

        # Bildextraktion
        image_saved = False
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data or hasattr(part, "as_image"):
                    try:
                        generated_img = part.as_image()
                        generated_img.save(outfit_filename)
                        image_saved = True
                    except:
                        image_data = base64.b64decode(part.inline_data.data)
                        with open(outfit_filename, "wb") as f:
                            f.write(image_data)
                        image_saved = True
                    break

        if not image_saved:
            print("⚠️ Stufe 1 fehlgeschlagen: AI hat kein Bild generiert.")
            return {"success": False, "error": "Gemini hat kein Bild generiert."}

        print(f"✅ Stufe 1 abgeschlossen. Basis-Bild: {outfit_filename}")

        # --- NEUER SCHRITT: Bild auf Original-Seitenverhältnis zuschneiden ---
        crop_to_match_aspect_ratio(
            image_to_crop_path=outfit_filename, reference_image_path=avatar_path
        )

        # Schritt 2: Replicate restauriert das Gesicht
        # Wir rufen die neue Hilfsfunktion auf. Sie überschreibt das Bild, wenn sie erfolgreich ist.
        await apply_face_restoration(avatar_path, outfit_filename)

        # Wir geben die URL zurück. Das Bild ist jetzt entweder das Original von Gemini
        # (falls Replicate versagt hat) oder die perfektionierte Version.
        final_url = f"http://localhost:8000/{outfit_filename}"
        print(f"🎉 Pipeline abgeschlossen. Finales Bild: {final_url}")
        return {"success": True, "outfit_url": final_url}

    except Exception as e:
        print(f"❌ Fehler in der Pipeline: {str(e)}")
        return {"success": False, "error": str(e)}
