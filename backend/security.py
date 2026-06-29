import base64
import hashlib
import hmac
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import Cookie, Header, HTTPException, Request, Response
from jwt import InvalidTokenError

from settings import AUTH_COOKIE_NAME, AUTH_COOKIE_SAMESITE, AUTH_COOKIE_SECURE

load_dotenv()

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
if not AUTH_SECRET_KEY or AUTH_SECRET_KEY in {
    "change-me-in-production",
    "replace-with-a-long-random-secret",
}:
    raise RuntimeError(
        "AUTH_SECRET_KEY is required and must be a unique high-entropy secret."
    )

if len(AUTH_SECRET_KEY) < 32:
    raise RuntimeError("AUTH_SECRET_KEY must be at least 32 characters long.")

JWT_ALGORITHM = "HS256"
JWT_ISSUER = os.getenv("AUTH_TOKEN_ISSUER", "dressup-exe-api")
JWT_AUDIENCE = os.getenv("AUTH_TOKEN_AUDIENCE", "dressup-exe-client")
ACCESS_TOKEN_EXPIRES_HOURS = 24
RATE_LIMIT_BUCKETS: dict[tuple[str, str], list[float]] = {}


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def is_valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def validate_password_strength(password: str) -> Optional[str]:
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


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    hashed = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt$16384$8$1${b64url_encode(salt)}${b64url_encode(hashed)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, n, r, p, salt_b64, hash_b64 = stored_hash.split("$")
        if algorithm != "scrypt":
            return False
        salt = b64url_decode(salt_b64)
        expected_hash = b64url_decode(hash_b64)
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


def create_access_token(subject: str, role: str) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(hours=ACCESS_TOKEN_EXPIRES_HOURS)
    payload = {
        "sub": subject,
        "role": role,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": issued_at,
        "exp": expires_at,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, AUTH_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            AUTH_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={
                "require": ["sub", "role", "iss", "aud", "iat", "exp", "jti"],
            },
        )
    except InvalidTokenError:
        return None


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=ACCESS_TOKEN_EXPIRES_HOURS * 60 * 60,
        expires=ACCESS_TOKEN_EXPIRES_HOURS * 60 * 60,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def build_owner_key(subject: str) -> str:
    digest = hashlib.sha256(subject.encode("utf-8")).hexdigest()[:16]
    return f"u_{digest}"


def get_current_actor(
    authorization: Optional[str] = Header(default=None),
    cookie_token: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
):
    token = extract_token_from_header(authorization) or cookie_token
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token.")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    subject = payload.get("sub", "")
    role = payload.get("role", "user")
    owner_key = build_owner_key(subject)
    return {"subject": subject, "role": role, "owner_key": owner_key}


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request, *, key: str, limit: int, window_seconds: int
) -> None:
    now = time.time()
    bucket_key = (client_ip(request), key)
    recent_hits = [
        hit
        for hit in RATE_LIMIT_BUCKETS.get(bucket_key, [])
        if now - hit < window_seconds
    ]

    if len(recent_hits) >= limit:
        retry_after = max(1, int(window_seconds - (now - recent_hits[0])))
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again.",
            headers={"Retry-After": str(retry_after)},
        )

    recent_hits.append(now)
    RATE_LIMIT_BUCKETS[bucket_key] = recent_hits
