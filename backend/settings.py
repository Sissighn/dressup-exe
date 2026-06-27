import os


def _strip_trailing_slash(value: str) -> str:
    return value.rstrip("/")


APP_BASE_URL = _strip_trailing_slash(
    os.getenv("APP_BASE_URL", "http://localhost:8000")
)
PUBLIC_ASSET_BASE_URL = _strip_trailing_slash(
    os.getenv("PUBLIC_ASSET_BASE_URL", APP_BASE_URL)
)


def get_cors_allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
    return [
        _strip_trailing_slash(origin.strip())
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


def build_upload_url(filename: str) -> str:
    return f"{PUBLIC_ASSET_BASE_URL}/uploads/{filename}"
