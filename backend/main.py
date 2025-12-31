from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import replicate
from dotenv import load_dotenv

# Lädt den API Key
load_dotenv()

app = FastAPI()

# CORS Setup
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
    return {"status": "DressUp AI Backend Online"}


@app.post("/generate-avatar")
async def generate_avatar(
    face_scan: UploadFile = File(...),
    # body_scan ist optional, da wir den Körper generieren!
    # Wir nehmen es trotzdem an, falls wir es später brauchen.
    body_scan: UploadFile = File(None),
    display_name: str = Form(...),
    height: str = Form(...),
    weight: str = Form(...),
    body_type: str = Form(...),
):
    try:
        # 1. Gesicht speichern (Das ist das Wichtigste!)
        face_path = f"{UPLOAD_DIR}/face_{face_scan.filename}"
        with open(face_path, "wb") as f:
            shutil.copyfileobj(face_scan.file, f)

        print(f"--> Neuer Digital Twin Auftrag für: {display_name}")
        print(f"--> Stats: {height}cm, {weight}kg, Type: {body_type}")

        # 2. Den perfekten Prompt bauen (Text-to-Image Logik)
        # Wir beschreiben den Körper basierend auf den Inputs
        # Hinweis: Wir gehen erstmal von einem weiblichen Model aus (da DressUp App meistens so startet),
        # das können wir später auch dynamisch machen.

        prompt_text = (
            f"A realistic full body studio photo of a fashion model, "
            f"{body_type} body shape, estimated weight {weight}kg, height {height}cm, "
            f"standing elegantly, neutral expression, "
            f"wearing simple tight white t-shirt and grey yoga pants, "
            f"soft studio lighting, 8k resolution, photorealistic, high fashion look."
        )

        print(f"--> AI Prompt: {prompt_text}")

        # 3. AI Aufrufen (InstantID auf Replicate)
        # Dieses Modell ist spezialisiert darauf, das Gesicht zu behalten!
        output = replicate.run(
            "wangfuyun/full-body-instantid:c582510c034078864a78ba8f9a263c9d749666014ba6e6a1006509a25b2933d3",
            input={
                "image": open(face_path, "rb"),  # Das Gesicht des Users
                "prompt": prompt_text,  # Die Beschreibung des Körpers
                "negative_prompt": "ugly, distorted, messy, low quality, nsfw, text, watermark, bad hands, extra fingers",
                "width": 768,
                "height": 1024,  # Hochformat für Ganzkörper
                "num_inference_steps": 30,
                "guidance_scale": 5,
            },
        )

        # Replicate gibt eine Liste zurück, wir nehmen das erste Bild
        avatar_url = output[0] if isinstance(output, list) else output
        print(f"--> Generierung erfolgreich: {avatar_url}")

        return {
            "status": "success",
            "message": "Digital Twin generated successfully",
            "data": {"name": display_name, "avatar_url": avatar_url},
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}
