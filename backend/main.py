from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import shutil
import re
import json
import hmac
import base64
import hashlib
from typing import Optional
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO
from pydantic import BaseModel
from PIL import ImageDraw

# Lokale Importe
from database import Base, engine, get_db, ClothingItem, User
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


def _ensure_schema_migrations():
    with engine.begin() as conn:
        columns = conn.execute(text("PRAGMA table_info(clothes)")).fetchall()
        column_names = {row[1] for row in columns}
        if "owner_key" not in column_names:
            conn.execute(
                text("ALTER TABLE clothes ADD COLUMN owner_key VARCHAR DEFAULT ''")
            )

        user_columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_column_names = {row[1] for row in user_columns}
        user_profile_fields = [
            ("display_name", "VARCHAR", "''"),
            ("avatar_url", "VARCHAR", "''"),
            ("face_scan_url", "VARCHAR", "''"),
            ("gender", "VARCHAR", "''"),
            ("height", "VARCHAR", "''"),
            ("weight", "VARCHAR", "''"),
            ("body_type", "VARCHAR", "''"),
        ]

        for field_name, field_type, field_default in user_profile_fields:
            if field_name not in user_column_names:
                conn.execute(
                    text(
                        f"ALTER TABLE users ADD COLUMN {field_name} {field_type} DEFAULT {field_default}"
                    )
                )


_ensure_schema_migrations()


# --- AUTH HELPERS ---
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change-me-in-production")
ACCESS_TOKEN_EXPIRES_HOURS = 24


class AuthRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    body_type: Optional[str] = None
    avatar_url: Optional[str] = None
    face_scan_url: Optional[str] = None


class StylingPlacedItem(BaseModel):
    image_path: str
    x: float
    y: float
    width: float
    aspect_ratio: Optional[float] = 1.0
    rotation: Optional[float] = 0.0
    z_index: Optional[int] = 0


class StylingBoardExportRequest(BaseModel):
    board_width: int
    board_height: int
    export_scale: Optional[int] = 3
    items: list[StylingPlacedItem]


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _is_valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def _validate_password_strength(password: str) -> Optional[str]:
    if len(password) < 12:
        return "Password must be at least 12 characters long."
    if re.search(r"\s", password):
        return "Password must not contain spaces."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password must contain at least one special character."
    return None


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    hashed = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt$16384$8$1${_b64url_encode(salt)}${_b64url_encode(hashed)}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, n, r, p, salt_b64, hash_b64 = stored_hash.split("$")
        if algorithm != "scrypt":
            return False
        salt = _b64url_decode(salt_b64)
        expected_hash = _b64url_decode(hash_b64)
        computed_hash = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected_hash),
        )
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False


def _create_access_token(subject: str, role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=ACCESS_TOKEN_EXPIRES_HOURS
    )
    payload = {
        "sub": subject,
        "role": role,
        "exp": int(expires_at.timestamp()),
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def _decode_access_token(token: str) -> Optional[dict]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_signature = hmac.new(
            AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        token_signature = _b64url_decode(signature_b64)

        if not hmac.compare_digest(expected_signature, token_signature):
            return None

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return payload
    except Exception:
        return None


def _extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def _build_owner_key(subject: str) -> str:
    digest = hashlib.sha256(subject.encode("utf-8")).hexdigest()[:16]
    return f"u_{digest}"


def _get_current_actor(authorization: Optional[str] = Header(default=None)):
    token = _extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token.")

    payload = _decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    subject = payload.get("sub", "")
    role = payload.get("role", "user")
    owner_key = _build_owner_key(subject)
    return {"subject": subject, "role": role, "owner_key": owner_key}


def _get_user_for_actor(actor: dict, db: Session) -> Optional[User]:
    if actor.get("role") != "user":
        return None
    return db.query(User).filter(User.email == actor.get("subject", "")).first()


@app.post("/auth/register")
def register(auth: AuthRequest, db: Session = Depends(get_db)):
    email = _normalize_email(auth.email)
    password = auth.password or ""

    if not _is_valid_email(email):
        raise HTTPException(
            status_code=400, detail="Please provide a valid email address."
        )

    password_error = _validate_password_strength(password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email is already registered.")

    user = User(email=email, password_hash=_hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = _create_access_token(subject=user.email, role="user")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": user.email, "role": "user"},
    }


@app.post("/auth/login")
def login(auth: AuthRequest, db: Session = Depends(get_db)):
    email = _normalize_email(auth.email)
    password = auth.password or ""

    user = db.query(User).filter(User.email == email).first()
    if not user or not _verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    access_token = _create_access_token(subject=user.email, role="user")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": user.email, "role": "user"},
    }


@app.post("/auth/guest")
def guest_login():
    guest_id = f"guest-{int(datetime.now(timezone.utc).timestamp())}"
    access_token = _create_access_token(subject=guest_id, role="guest")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": "guest@local", "role": "guest"},
    }


@app.get("/auth/me")
def auth_me(authorization: Optional[str] = Header(default=None)):
    token = _extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token.")

    payload = _decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    role = payload.get("role", "user")
    subject = payload.get("sub", "")
    return {
        "email": subject if role == "user" else "guest@local",
        "role": role,
    }


@app.get("/profile")
def get_profile(actor=Depends(_get_current_actor), db: Session = Depends(get_db)):
    user = _get_user_for_actor(actor, db)
    if not user:
        return {
            "display_name": "",
            "avatar_url": "",
            "face_scan_url": "",
            "gender": "",
            "height": "",
            "weight": "",
            "body_type": "",
        }

    return {
        "display_name": user.display_name or "",
        "avatar_url": user.avatar_url or "",
        "face_scan_url": user.face_scan_url or "",
        "gender": user.gender or "",
        "height": user.height or "",
        "weight": user.weight or "",
        "body_type": user.body_type or "",
    }


@app.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    actor=Depends(_get_current_actor),
    db: Session = Depends(get_db),
):
    user = _get_user_for_actor(actor, db)
    if not user:
        raise HTTPException(
            status_code=403, detail="Guests cannot persist profile data."
        )

    updates = payload.model_dump(exclude_unset=True)
    for field in [
        "display_name",
        "avatar_url",
        "face_scan_url",
        "gender",
        "height",
        "weight",
        "body_type",
    ]:
        if field in updates:
            setattr(user, field, updates[field] or "")

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "profile": {
            "display_name": user.display_name or "",
            "avatar_url": user.avatar_url or "",
            "face_scan_url": user.face_scan_url or "",
            "gender": user.gender or "",
            "height": user.height or "",
            "weight": user.weight or "",
            "body_type": user.body_type or "",
        },
    }


@app.get("/")
def read_root():
    return {
        "status": "Backend Online - Smart Avatar & Closet Database",
        "features": ["Gemini AI", "SQLite Database"],
    }


# --- NEU: GALLERY ENDPOINTS ---
import time


@app.post("/archive-look")
async def archive_look(payload: dict, actor=Depends(_get_current_actor)):
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
        new_filename = f"archived_look_{actor['owner_key']}_{int(time.time())}.png"
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
async def get_gallery(actor=Depends(_get_current_actor)):
    outfits = []
    if not os.path.exists(UPLOAD_DIR):
        return []

    for file in os.listdir(UPLOAD_DIR):
        # NUR Bilder anzeigen, die explizit archiviert wurden
        if file.startswith(f"archived_look_{actor['owner_key']}_"):
            outfits.append(
                {
                    "id": file,
                    "url": f"http://localhost:8000/uploads/{file}",
                    "date": os.path.getctime(os.path.join(UPLOAD_DIR, file)),
                }
            )
    outfits.sort(key=lambda x: x["date"], reverse=True)
    return outfits


@app.delete("/delete-look/{filename}")
async def delete_look(filename: str, actor=Depends(_get_current_actor)):
    """Löscht einen archivierten Look vom Server"""
    try:
        # Sicherheitssperre: Nur Dateien löschen, die zum Archiv gehören
        if not filename.startswith(f"archived_look_{actor['owner_key']}_"):
            raise HTTPException(
                status_code=403, detail="Not permitted to delete this file"
            )

        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"status": "success", "message": f"Look {filename} deleted"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- CLOSET ENDPOINTS ---


@app.post("/upload-item")
async def upload_item(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
    actor=Depends(_get_current_actor),
):
    # 1. Bild sicher benennen und lokal speichern
    original_name, original_ext = os.path.splitext(file.filename or "item.png")
    safe_original_name = (original_name or "item").replace(" ", "_")
    safe_filename = f"{actor['owner_key']}_{category}_{int(time.time())}_{safe_original_name}{original_ext or '.png'}"
    local_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(local_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        processed_path = services.remove_background_from_image(local_path)
    except Exception as exc:
        print(f"⚠️ Background removal skipped for {safe_filename}: {exc}")
        processed_path = local_path

    final_filename = os.path.basename(processed_path)

    # 2. SAUBERE URL GENERIEREN (Wichtig für das Frontend!)
    # Wir speichern NICHT den lokalen Pfad, sondern die Web-URL
    image_url = f"http://localhost:8000/uploads/{final_filename}"

    # 3. In Datenbank speichern
    new_item = ClothingItem(
        name=name,
        category=category,
        image_path=image_url,
        owner_key=actor["owner_key"],
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"status": "success", "item": new_item}


@app.get("/closet")
async def get_closet(db: Session = Depends(get_db), actor=Depends(_get_current_actor)):
    return (
        db.query(ClothingItem)
        .filter(ClothingItem.owner_key == actor["owner_key"])
        .all()
    )


@app.post("/export-styling-board")
async def export_styling_board(
    payload: StylingBoardExportRequest, actor=Depends(_get_current_actor)
):
    if payload.board_width <= 0 or payload.board_height <= 0:
        raise HTTPException(status_code=400, detail="Invalid board size.")

    if not payload.items:
        raise HTTPException(status_code=400, detail="No board items provided.")

    try:
        scale = max(1, min(int(payload.export_scale or 3), 6))
        out_w = int(payload.board_width * scale)
        out_h = int(payload.board_height * scale)

        canvas = Image.new("RGBA", (out_w, out_h), (255, 255, 255, 255))
        draw = ImageDraw.Draw(canvas)

        grid = 28 * scale
        # Match the very soft UI grid from Styling Lab (subtle and light)
        grid_color = (0, 0, 0, 2)

        for x in range(0, out_w + 1, grid):
            draw.line([(x, 0), (x, out_h)], fill=grid_color, width=1)
        for y in range(0, out_h + 1, grid):
            draw.line([(0, y), (out_w, y)], fill=grid_color, width=1)

        ordered_items = sorted(payload.items, key=lambda item: item.z_index or 0)

        for item in ordered_items:
            raw_path = (item.image_path or "").split("?")[0]
            filename = os.path.basename(raw_path)
            if not filename:
                continue

            file_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(file_path):
                continue

            # Sicherheitsgrenze: nur eigene Uploads erlauben
            if not filename.startswith(f"{actor['owner_key']}_"):
                continue

            with Image.open(file_path) as src:
                source = src.convert("RGBA")

            draw_w = max(1, int(round(item.width * scale)))
            ratio = item.aspect_ratio or 1.0
            draw_h = max(1, int(round(draw_w * ratio)))

            source = source.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
            rotated = source.rotate(
                float(item.rotation or 0.0),
                resample=Image.Resampling.BICUBIC,
                expand=True,
            )

            center_x = (item.x * scale) + draw_w / 2
            center_y = (item.y * scale) + draw_h / 2
            paste_x = int(round(center_x - rotated.width / 2))
            paste_y = int(round(center_y - rotated.height / 2))

            canvas.paste(rotated, (paste_x, paste_y), rotated)

        filename = f"styling_board_{actor['owner_key']}_{int(time.time())}.png"
        output_path = os.path.join(UPLOAD_DIR, filename)
        canvas.convert("RGB").save(output_path, format="PNG", optimize=False)

        return {
            "status": "success",
            "image_url": f"http://localhost:8000/uploads/{filename}",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Board export failed: {exc}")


@app.delete("/delete-item/{item_id}")
async def delete_item(
    item_id: int, db: Session = Depends(get_db), actor=Depends(_get_current_actor)
):
    item_to_delete = (
        db.query(ClothingItem)
        .filter(
            ClothingItem.id == item_id,
            ClothingItem.owner_key == actor["owner_key"],
        )
        .first()
    )

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


@app.post("/generate-avatar")
async def generate_avatar(
    face_scan: UploadFile = File(...),
    display_name: str = Form(...),
    height: str = Form(...),
    weight: str = Form(...),
    body_type: str = Form(...),
    gender: str = Form(...),  # NEU: "male" oder "female"
    db: Session = Depends(get_db),
    actor=Depends(_get_current_actor),
):
    try:
        face_path = os.path.join(
            UPLOAD_DIR,
            f"face_{actor['owner_key']}_{int(time.time())}_{face_scan.filename}",
        )
        with open(face_path, "wb") as f:
            shutil.copyfileobj(face_scan.file, f)

        face_scan_url = f"http://localhost:8000/uploads/{os.path.basename(face_path)}"

        # Wir geben gender an die services weiter
        result = await services.try_gemini_generation(
            face_path,
            f"{actor['owner_key']}_{display_name}",
            height,
            weight,
            body_type,
            gender,
        )

        if result["success"]:
            result["face_scan_url"] = face_scan_url
            user = _get_user_for_actor(actor, db)
            if user and result.get("avatar_url"):
                user.avatar_url = result.get("avatar_url", "")
                user.face_scan_url = face_scan_url
                user.display_name = display_name or ""
                user.gender = gender or ""
                user.height = height or ""
                user.weight = weight or ""
                user.body_type = body_type or ""
                db.add(user)
                db.commit()
            return {"status": "success", "data": result}
        raise HTTPException(
            status_code=422,
            detail=result.get("error", "Generation failed"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/try-on-outfit")
async def try_on_outfit(
    avatar_image: UploadFile = File(...),
    top_image: UploadFile = File(...),
    bottom_image: UploadFile = File(...),
    actor=Depends(_get_current_actor),
):
    try:
        ts = int(time.time())
        av_p = f"{UPLOAD_DIR}/temp_av_{actor['owner_key']}_{ts}.png"
        tp_p = f"{UPLOAD_DIR}/temp_tp_{actor['owner_key']}_{ts}.png"
        bt_p = f"{UPLOAD_DIR}/temp_bt_{actor['owner_key']}_{ts}.png"

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


@app.get("/providers/check")
def check_providers():
    google_key = os.getenv("GOOGLE_API_KEY")
    return {
        "gemini": "Ready" if google_key else "Missing",
    }
