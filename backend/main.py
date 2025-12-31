from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

# ------------------------------
import os
import shutil
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

# Lokale Importe für aufgeteilte Logik
from database import Base, engine, get_db, ClothingItem
import services

load_dotenv()

# Tabelle erstellen
Base.metadata.create_all(bind=engine)

# ------------------------------------
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI()


class StaticCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response


app.add_middleware(StaticCORSMiddleware)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {
        "status": "Backend Online - Smart Avatar & Closet Database",
        "features": ["Auto-Fallback", "Gemini + Replicate", "SQLite Database"],
        "info": "Versucht zuerst Gemini, wechselt automatisch zu Replicate bei Quota-Error",
    }


# --- NEU: CLOSET ENDPOINTS ---


@app.post("/upload-item")
async def upload_item(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
):
    # 1. Bild sicher benennen und speichern
    safe_filename = f"{category}_{file.filename}".replace(" ", "_")
    file_path = f"{UPLOAD_DIR}/{safe_filename}"

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2. URL generieren
    image_url = f"http://localhost:8000/{file_path}"

    # 3. In Datenbank speichern
    new_item = ClothingItem(name=name, category=category, image_path=image_url)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"status": "success", "item": new_item}


@app.get("/closet")
async def get_closet(db: Session = Depends(get_db)):
    items = db.query(ClothingItem).all()
    return items


@app.delete("/delete-item/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    # 1. Item in der Datenbank finden
    item_to_delete = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()

    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Zugehörige Bilddatei vom Server löschen
    try:
        # Extrahiere den relativen Pfad aus der URL
        # z.B. von "http://localhost:8000/uploads/TOPS_shirt.png" zu "uploads/TOPS_shirt.png"
        if item_to_delete.image_path.startswith("http://localhost:8000/"):
            local_path = item_to_delete.image_path.replace("http://localhost:8000/", "")
            if os.path.exists(local_path):
                os.remove(local_path)
    except Exception as e:
        # Logge den Fehler, aber fahre trotzdem fort, um den DB-Eintrag zu löschen
        print(f"Could not delete file for item {item_id}: {e}")

    # 3. Eintrag aus der Datenbank löschen
    db.delete(item_to_delete)
    db.commit()

    return {"status": "success", "message": f"Item {item_id} deleted"}


@app.post("/try-on-outfit")
async def try_on_outfit(
    avatar_image: UploadFile = File(...),
    top_image: UploadFile = File(...),
    bottom_image: UploadFile = File(...),
):
    try:
        # Temp Speicher
        av_p = f"{UPLOAD_DIR}/temp_av.png"
        tp_p = f"{UPLOAD_DIR}/temp_tp.png"
        bt_p = f"{UPLOAD_DIR}/temp_bt.png"

        with open(av_p, "wb") as f:
            shutil.copyfileobj(avatar_image.file, f)
        with open(tp_p, "wb") as f:
            shutil.copyfileobj(top_image.file, f)
        with open(bt_p, "wb") as f:
            shutil.copyfileobj(bottom_image.file, f)

        result = await services.try_gemini_outfit_generation(av_p, tp_p, bt_p)
        if result["success"]:
            return result
        raise HTTPException(status_code=500, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------


@app.post("/generate-avatar")
async def generate_avatar(
    face_scan: UploadFile = File(...),
    # body_scan entfernt, da wir nur noch face_scan nutzen
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

        print(f"\n{'='*60}")
        print(f"🎨 Avatar für: {display_name}")
        print(f"📊 {body_type}, {height}cm, {weight}kg")
        print(f"{'='*60}\n")

        # VERSUCH 1: Gemini (schnell & günstig)
        result = await services.try_gemini_generation(
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

            result = await services.try_replicate_generation(
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
