from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from sqlalchemy.orm import Session

from database import User, get_db
from schemas import AuthRequest, ProfileUpdateRequest
from security import (
    AUTH_COOKIE_NAME,
    clear_auth_cookie,
    create_access_token,
    decode_access_token,
    enforce_rate_limit,
    extract_token_from_header,
    get_current_actor,
    hash_password,
    is_valid_email,
    normalize_email,
    set_auth_cookie,
    validate_password_strength,
    verify_password,
)
from storage import normalize_upload_url

router = APIRouter()


def get_user_for_actor(actor: dict, db: Session) -> Optional[User]:
    if actor.get("role") != "user":
        return None
    return db.query(User).filter(User.email == actor.get("subject", "")).first()


@router.post("/auth/register")
def register(
    auth: AuthRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, key="auth:register", limit=5, window_seconds=60 * 60)
    email = normalize_email(auth.email)
    password = auth.password or ""

    if not is_valid_email(email):
        raise HTTPException(
            status_code=400, detail="Please provide a valid email address."
        )

    password_error = validate_password_strength(password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email is already registered.")

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.email, role="user")
    set_auth_cookie(response, access_token)
    return {
        "token_type": "bearer",
        "user": {"email": user.email, "role": "user"},
    }


@router.post("/auth/login")
def login(
    auth: AuthRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, key="auth:login", limit=10, window_seconds=15 * 60)
    email = normalize_email(auth.email)
    password = auth.password or ""

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    access_token = create_access_token(subject=user.email, role="user")
    set_auth_cookie(response, access_token)
    return {
        "token_type": "bearer",
        "user": {"email": user.email, "role": "user"},
    }


@router.post("/auth/guest")
def guest_login(response: Response, request: Request):
    enforce_rate_limit(request, key="auth:guest", limit=20, window_seconds=15 * 60)
    guest_id = f"guest-{int(datetime.now(timezone.utc).timestamp())}"
    access_token = create_access_token(subject=guest_id, role="guest")
    set_auth_cookie(response, access_token)
    return {
        "token_type": "bearer",
        "user": {"email": "guest@local", "role": "guest"},
    }


@router.post("/auth/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"status": "success"}


@router.get("/auth/me")
def auth_me(
    authorization: Optional[str] = Header(default=None),
    cookie_token: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
):
    token = extract_token_from_header(authorization) or cookie_token
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token.")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    role = payload.get("role", "user")
    subject = payload.get("sub", "")
    return {
        "email": subject if role == "user" else "guest@local",
        "role": role,
    }


@router.get("/profile")
def get_profile(actor=Depends(get_current_actor), db: Session = Depends(get_db)):
    user = get_user_for_actor(actor, db)
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
        "avatar_url": normalize_upload_url(user.avatar_url),
        "face_scan_url": normalize_upload_url(user.face_scan_url),
        "gender": user.gender or "",
        "height": user.height or "",
        "weight": user.weight or "",
        "body_type": user.body_type or "",
    }


@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    actor=Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    user = get_user_for_actor(actor, db)
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
            "avatar_url": normalize_upload_url(user.avatar_url),
            "face_scan_url": normalize_upload_url(user.face_scan_url),
            "gender": user.gender or "",
            "height": user.height or "",
            "weight": user.weight or "",
            "body_type": user.body_type or "",
        },
    }
