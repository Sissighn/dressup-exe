import os

from dotenv import load_dotenv

load_dotenv()


def _strip_trailing_slash(value: str) -> str:
    return value.rstrip("/")


APP_BASE_URL = _strip_trailing_slash(
    os.getenv("APP_BASE_URL", "http://localhost:8000")
)
PUBLIC_ASSET_BASE_URL = _strip_trailing_slash(
    os.getenv("PUBLIC_ASSET_BASE_URL", APP_BASE_URL)
)
AUTH_COOKIE_NAME = "dressup_access_token"
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").lower()
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
MAX_UPLOAD_PIXELS = int(os.getenv("MAX_UPLOAD_PIXELS", str(24_000_000)))
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_cors_allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
    return [
        _strip_trailing_slash(origin.strip())
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


def build_upload_url(filename: str) -> str:
    return f"{PUBLIC_ASSET_BASE_URL}/uploads/{filename}"
