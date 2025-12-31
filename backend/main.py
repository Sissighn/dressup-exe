from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from typing import Optional

app = FastAPI()

# CORS erlaubt Zugriff vom Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def read_root():
    return {"status": "DressUp AI Backend Online"}


# Der NEUE "Digital Twin" Endpunkt
@app.post("/generate-avatar")
async def generate_avatar(
    # Wir erwarten zwei Dateien
    face_scan: UploadFile = File(...),
    body_scan: UploadFile = File(...),
    # Und die Text-Daten aus dem Formular
    display_name: str = Form(...),
    height: int = Form(...),
    weight: int = Form(...),
    body_type: str = Form(...),
):
    # 1. Dateien sicher benennen und speichern
    # Wir nutzen f-strings für saubere Pfade
    face_path = f"{UPLOAD_DIR}/face_{face_scan.filename}"
    body_path = f"{UPLOAD_DIR}/body_{body_scan.filename}"

    with open(face_path, "wb") as f:
        shutil.copyfileobj(face_scan.file, f)

    with open(body_path, "wb") as f:
        shutil.copyfileobj(body_scan.file, f)

    # 2. Hier würde später die AI aufgerufen werden
    # Aktuell simulieren wir den Erfolg und geben die Pfade zurück

    print(f"New Request: {display_name}, {height}cm, {weight}kg")
    print(f"Saved images to: {face_path} and {body_path}")

    return {
        "status": "success",
        "message": "Digital Twin initialization started",
        "data": {
            "name": display_name,
            "avatar_url": f"http://localhost:8000/{body_path}",  # Simulierte URL
        },
    }


# Hilfs-Endpunkt, um die Bilder im Browser auch sehen zu können (Static Files)
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
