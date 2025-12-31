from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# 1. CORS konfigurieren
# Das erlaubt deinem Frontend (localhost:5173), mit diesem Backend zu reden.
# Ohne das würde der Browser den Zugriff blockieren (Sicherheitsfeature).
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ordner für Uploads erstellen, falls nicht existent
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def read_root():
    return {"status": "online", "system": "DressUp AI Backend v1.0"}


# Der Upload Endpunkt (Hier passiert die Magie)
@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # 1. Dateipfad definieren
    file_location = f"{UPLOAD_DIR}/{file.filename}"

    # 2. Datei speichern
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())

    # 3. Bestätigung zurücksenden
    return {
        "info": f"file '{file.filename}' saved at '{file_location}'",
        "filename": file.filename,
    }
