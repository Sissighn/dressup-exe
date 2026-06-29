import os
import shutil
import tempfile
from io import BytesIO

import pytest
from PIL import Image
from fastapi.testclient import TestClient

TEST_ROOT = tempfile.mkdtemp(prefix="dressup-api-tests-")
TEST_UPLOAD_DIR = os.path.join(TEST_ROOT, "uploads")
TEST_DB_PATH = os.path.join(TEST_ROOT, "test.db")

os.environ["AUTH_SECRET_KEY"] = "test-secret-key-with-more-than-32-characters"
os.environ["AUTH_COOKIE_SECURE"] = "false"
os.environ["AUTH_COOKIE_SAMESITE"] = "lax"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["UPLOAD_DIR"] = TEST_UPLOAD_DIR
os.environ["APP_BASE_URL"] = "http://testserver"
os.environ["PUBLIC_ASSET_BASE_URL"] = "http://testserver"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173"
os.environ["MAX_UPLOAD_BYTES"] = str(2 * 1024 * 1024)
os.environ["MAX_UPLOAD_PIXELS"] = str(4_000_000)

from database import Base, engine  # noqa: E402
from main import app  # noqa: E402
from security import RATE_LIMIT_BUCKETS, build_owner_key, decode_access_token  # noqa: E402
import services  # noqa: E402


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    RATE_LIMIT_BUCKETS.clear()
    shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)
    os.makedirs(TEST_UPLOAD_DIR, exist_ok=True)

    monkeypatch.setattr(services, "remove_background_from_image", lambda path: path)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_png_bytes(size=(32, 32), color=(220, 180, 120, 255)) -> bytes:
    buffer = BytesIO()
    Image.new("RGBA", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def register_user(client: TestClient, email="person@example.com", password="StrongPass123!"):
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response


def current_owner_key(client: TestClient) -> str:
    token = client.cookies.get("dressup_access_token")
    assert token
    payload = decode_access_token(token)
    assert payload
    return build_owner_key(payload["sub"])
