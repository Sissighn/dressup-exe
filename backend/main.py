import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def read_root():
    return {
        "status": "Backend Online - Smart Avatar & Closet Database",
        "features": ["Gemini AI", "SQLite Database"],
    }


app.include_router(auth.router)
app.include_router(gallery.router)
app.include_router(closet.router)
app.include_router(avatar.router)
