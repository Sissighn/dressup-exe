from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def read_root():
    return {
        "status": "Backend Online - Smart Avatar Generator",
        "features": ["Auto-Fallback", "Gemini + Replicate"],
        "info": "Versucht zuerst Gemini, wechselt automatisch zu Replicate bei Quota-Error",
    }


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
            f"A photo of a {body_type} person img, "
            f"height {height}cm, weight {weight}kg, "
            f"wearing simple white tank top and grey leggings, "
            f"standing in studio, neutral background, "
            f"full body visible, high quality, realistic, 8k"
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


@app.post("/generate-avatar")
async def generate_avatar(
    face_scan: UploadFile = File(...),
    body_scan: UploadFile = File(None),
    display_name: str = Form(...),
    height: str = Form(...),
    weight: str = Form(...),
    body_type: str = Form(...),
):
    """Smart Avatar Generator mit automatischem Fallback"""

    try:
        # Gesichtsbild speichern
        face_path = f"{UPLOAD_DIR}/face_{face_scan.filename}"
        with open(face_path, "wb") as f:
            shutil.copyfileobj(face_scan.file, f)

        if body_scan:
            print("ℹ️  Body Scan wird ignoriert")

        print(f"\n{'='*60}")
        print(f"🎨 Avatar für: {display_name}")
        print(f"📊 {body_type}, {height}cm, {weight}kg")
        print(f"{'='*60}\n")

        # VERSUCH 1: Gemini (schnell & günstig)
        result = await try_gemini_generation(
            face_path, display_name, height, weight, body_type
        )

        if result["success"]:
            return {
                "status": "success",
                "message": "Avatar generated with Gemini Nano Banana",
                "provider": "gemini",
                "data": {
                    "name": display_name,
                    "avatar_url": result["avatar_url"],
                    "body_type": body_type,
                    "height": height,
                    "weight": weight,
                },
            }

        # VERSUCH 2: Replicate Fallback (wenn Gemini quota überschritten)
        if result["error"] == "quota_exceeded":
            print("\n🔄 Gemini Quota erreicht → Wechsel zu Replicate...\n")

            result = await try_replicate_generation(
                face_path, display_name, height, weight, body_type
            )

            if result["success"]:
                return {
                    "status": "success",
                    "message": "Avatar generated with Replicate PhotoMaker (Gemini quota exceeded)",
                    "provider": "replicate",
                    "fallback_used": True,
                    "data": {
                        "name": display_name,
                        "avatar_url": result["avatar_url"],
                        "body_type": body_type,
                        "height": height,
                        "weight": weight,
                    },
                }

        # Beide fehlgeschlagen
        raise Exception(
            f"Beide Provider fehlgeschlagen. Gemini: {result.get('error', 'unknown')}"
        )

    except Exception as e:
        print(f"\n❌ FINALE ERROR: {str(e)}\n")
        return {
            "status": "error",
            "message": str(e),
            "solutions": [
                "Prüfe ob GOOGLE_API_KEY und REPLICATE_API_TOKEN in .env gesetzt sind",
                "Gemini: Upgrade zu Pay-as-you-go auf ai.google.dev",
                "Replicate: Hole dir Token auf replicate.com/account/api-tokens",
            ],
        }


@app.get("/providers/check")
def check_providers():
    """Zeigt welche Provider konfiguriert sind"""
    status = {}

    # Gemini Check
    google_key = os.getenv("GOOGLE_API_KEY")
    status["gemini"] = {
        "configured": bool(google_key),
        "status": "🟢 Ready" if google_key else "🔴 Missing API Key",
        "get_key": "https://aistudio.google.com/apikey",
    }

    # Replicate Check
    replicate_key = os.getenv("REPLICATE_API_TOKEN")
    status["replicate"] = {
        "configured": bool(replicate_key),
        "status": "🟢 Ready" if replicate_key else "🔴 Missing API Token",
        "get_token": "https://replicate.com/account/api-tokens",
    }

    return {
        "providers": status,
        "recommendation": (
            "Beide APIs konfigurieren für maximale Verfügbarkeit"
            if not (google_key and replicate_key)
            else "✅ Alle Provider bereit!"
        ),
    }


@app.post("/test-gemini")
async def test_gemini(face_scan: UploadFile = File(...)):
    """Debug-Endpoint um Gemini Response-Struktur zu testen"""
    try:
        from google import genai
        from google.genai import types

        # Bild vorbereiten
        face_path = f"{UPLOAD_DIR}/test_{face_scan.filename}"
        with open(face_path, "wb") as f:
            shutil.copyfileobj(face_scan.file, f)

        face_image = Image.open(face_path)
        img_byte_arr = BytesIO()
        face_image.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        # Einfacher Test-Prompt
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=[
                "Create a simple avatar of this person",
                types.Part.from_bytes(
                    data=img_byte_arr.getvalue(), mime_type="image/png"
                ),
            ],
        )

        # Response analysieren
        debug_info = {
            "response_type": str(type(response)),
            "has_candidates": hasattr(response, "candidates"),
            "has_parts": hasattr(response, "parts"),
            "has_text": hasattr(response, "text"),
        }

        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            debug_info["candidate_type"] = str(type(candidate))
            debug_info["has_content"] = hasattr(candidate, "content")

            if hasattr(candidate, "content") and candidate.content:
                content = candidate.content
                debug_info["content_type"] = str(type(content))
                debug_info["has_content_parts"] = hasattr(content, "parts")

                if hasattr(content, "parts") and content.parts:
                    debug_info["num_parts"] = len(content.parts)
                    for i, part in enumerate(content.parts):
                        debug_info[f"part_{i}_type"] = str(type(part))
                        debug_info[f"part_{i}_has_inline_data"] = hasattr(
                            part, "inline_data"
                        )
                        debug_info[f"part_{i}_has_text"] = hasattr(part, "text")

                        if hasattr(part, "text") and part.text:
                            debug_info[f"part_{i}_text_preview"] = part.text[:100]

        # Versuche Text zu extrahieren falls vorhanden
        if hasattr(response, "text"):
            debug_info["response_text"] = response.text[:200]

        return {
            "status": "debug",
            "message": "Gemini Response Struktur",
            "debug": debug_info,
        }

    except Exception as e:
        return {"status": "error", "message": str(e), "type": str(type(e))}
