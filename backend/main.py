from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
import shutil
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

# Lokale Importe
from database import Base, engine, get_db, ClothingItem
import services

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- SAUBERE CORS KONFIGURATION ---
# Erlaubt dem Frontend (Port 5173) alle Methoden (GET, POST, DELETE, OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ABSOLUTE PFADE ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Statische Dateien mounten (Damit http://localhost:8000/uploads/... funktioniert)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {
        "status": "Backend Online - Smart Avatar & Closet Database",
        "features": ["Auto-Fallback", "Gemini + Replicate", "SQLite Database"],
    }


# --- NEU: GALLERY ENDPOINTS ---
import time


@app.post("/archive-look")
async def archive_look(payload: dict):
    """Kopiert das temporäre Outfit-Bild in ein dauerhaftes Archiv-Bild"""
    try:
        temp_url = payload.get("outfit_url", "")
        if not temp_url:
            raise HTTPException(status_code=400, detail="No URL provided")

        # Filename extrahieren (z.B. outfit_result_temp_av.png)
        filename = temp_url.split("/")[-1].split("?")[0]
        source_path = os.path.join(UPLOAD_DIR, filename)

        if not os.path.exists(source_path):
            raise HTTPException(status_code=404, detail="Source image not found")

        # Neuen Namen für das Archiv generieren
        new_filename = f"archived_look_{int(time.time())}.png"
        dest_path = os.path.join(UPLOAD_DIR, new_filename)

        # Datei kopieren
        shutil.copy2(source_path, dest_path)

        return {
            "status": "success",
            "archived_url": f"http://localhost:8000/uploads/{new_filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gallery")
async def get_gallery(db: Session = Depends(get_db)):
    outfits = []
    if not os.path.exists(UPLOAD_DIR):
        return []

    for file in os.listdir(UPLOAD_DIR):
        # NUR Bilder anzeigen, die explizit archiviert wurden
        if file.startswith("archived_look_"):
            outfits.append(
                {
                    "id": file,
                    "url": f"http://localhost:8000/uploads/{file}",
                    "date": os.path.getctime(os.path.join(UPLOAD_DIR, file)),
                }
            )
    outfits.sort(key=lambda x: x["date"], reverse=True)
    return outfits


# --- CLOSET ENDPOINTS ---


@app.post("/upload-item")
async def upload_item(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
):
    # 1. Bild sicher benennen und lokal speichern
    safe_filename = f"{category}_{file.filename}".replace(" ", "_")
    local_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(local_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2. SAUBERE URL GENERIEREN (Wichtig für das Frontend!)
    # Wir speichern NICHT den lokalen Pfad, sondern die Web-URL
    image_url = f"http://localhost:8000/uploads/{safe_filename}"

    # 3. In Datenbank speichern
    new_item = ClothingItem(name=name, category=category, image_path=image_url)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"status": "success", "item": new_item}


@app.get("/closet")
async def get_closet(db: Session = Depends(get_db)):
    return db.query(ClothingItem).all()


@app.delete("/delete-item/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    item_to_delete = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()

    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Zugehörige Bilddatei vom Server löschen
    try:
        # Extrahiere den Dateinamen aus der URL (z.B. von http://.../uploads/file.png zu file.png)
        filename = item_to_delete.image_path.split("/")[-1]
        local_file_path = os.path.join(UPLOAD_DIR, filename)

        if os.path.exists(local_file_path):
            os.remove(local_file_path)
    except Exception as e:
        print(f"Could not delete file: {e}")

    # 3. Aus Datenbank löschen
    db.delete(item_to_delete)
    db.commit()

    return {"status": "success", "message": f"Item {item_id} deleted"}


# --- OUTFIT & AVATAR LOGIK ---


@app.post("/try-on-outfit")
async def try_on_outfit(
    avatar_image: UploadFile = File(...),
    top_image: UploadFile = File(...),
    bottom_image: UploadFile = File(...),
):
    try:
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


@app.post("/generate-avatar")
async def generate_avatar(
    face_scan: UploadFile = File(...),
    display_name: str = Form(...),
    height: str = Form(...),
    weight: str = Form(...),
    body_type: str = Form(...),
):
    try:
        face_path = os.path.join(UPLOAD_DIR, f"face_{face_scan.filename}")
        with open(face_path, "wb") as f:
            shutil.copyfileobj(face_scan.file, f)

        result = await services.try_gemini_generation(
            face_path, display_name, height, weight, body_type
        )
        if result["success"]:
            return {"status": "success", "data": result}

        # Fallback zu Replicate
        if result.get("error") == "quota_exceeded":
            result = await services.try_replicate_generation(
                face_path, display_name, height, weight, body_type
            )
            if result["success"]:
                return {"status": "success", "data": result}

        raise Exception(result.get("error", "Generation failed"))
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/providers/check")
def check_providers():
    google_key = os.getenv("GOOGLE_API_KEY")
    replicate_key = os.getenv("REPLICATE_API_TOKEN")
    return {
        "gemini": "Ready" if google_key else "Missing",
        "replicate": "Ready" if replicate_key else "Missing",
    }
