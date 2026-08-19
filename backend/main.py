import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers import auth, avatar, closet, gallery
from settings import get_cors_allowed_origins

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


FRONTEND_DIST = os.getenv("FRONTEND_DIST", "").strip()


@app.get("/healthz")
def read_health():
    return {
        "status": "Backend Online - Smart Avatar & Closet Database",
        "features": ["Gemini AI", "SQLite Database"],
    }


if not FRONTEND_DIST:

    @app.get("/")
    def read_root():
        return read_health()


app.include_router(auth.router)
app.include_router(gallery.router)
app.include_router(closet.router)
app.include_router(avatar.router)


if FRONTEND_DIST:
    # Desktop-Modus: das gebaute Frontend wird vom selben Origin ausgeliefert,
    # damit HttpOnly-Cookies und /uploads ohne CORS funktionieren.
    _INDEX_FILE = os.path.join(FRONTEND_DIST, "index.html")
    _ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")

    if os.path.isdir(_ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = os.path.normpath(os.path.join(FRONTEND_DIST, full_path))
        if (
            full_path
            and candidate.startswith(os.path.abspath(FRONTEND_DIST))
            and os.path.isfile(candidate)
        ):
            return FileResponse(candidate)

        if os.path.splitext(full_path)[1]:
            raise HTTPException(status_code=404, detail="Not found")

        return FileResponse(_INDEX_FILE)
